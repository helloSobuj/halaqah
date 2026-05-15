-- 1. Extend quiz_questions with new columns
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS correct_text TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS correct_order INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS hint_en TEXT,
  ADD COLUMN IF NOT EXISTS hint_bn TEXT;

-- 2. Replace submit_quiz_attempt to grade by type
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_quiz_id uuid, _answers jsonb, _time_taken integer, _ip text, _fingerprint text, _ua text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user UUID := auth.uid();
  _quiz quizzes%ROWTYPE;
  _q quiz_questions%ROWTYPE;
  _given_arr INT[];
  _total INT := 0;
  _score INT := 0;
  _earned INT := 0;
  _attempt_count INT;
  _now TIMESTAMPTZ := now();
  _rank INT;
  _new_badges JSONB := '[]'::jsonb;
  _attempt_id UUID;
  _last_attempt TIMESTAMPTZ;
  _streak INT;
  _is_staff BOOLEAN;
  _ans JSONB;
  _correct BOOLEAN;
  _norm TEXT;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _quiz FROM quizzes WHERE id = _quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  _is_staff := has_role(_user,'admin') OR has_role(_user,'moderator') OR has_role(_user,'scholar');

  IF NOT _is_staff THEN
    IF NOT _quiz.published THEN RAISE EXCEPTION 'Quiz not published'; END IF;
    IF _quiz.starts_at IS NOT NULL AND _now < _quiz.starts_at THEN RAISE EXCEPTION 'Quiz not started'; END IF;
    IF _quiz.ends_at IS NOT NULL AND _now > _quiz.ends_at THEN RAISE EXCEPTION 'Quiz ended'; END IF;
    IF _quiz.max_attempts > 0 THEN
      SELECT COUNT(*) INTO _attempt_count FROM quiz_attempts
        WHERE quiz_id = _quiz_id
          AND (user_id = _user
               OR (_ip <> '' AND ip_address = _ip)
               OR (_fingerprint <> '' AND fingerprint = _fingerprint));
      IF _attempt_count >= _quiz.max_attempts THEN
        RAISE EXCEPTION 'Attempt limit reached';
      END IF;
    END IF;
  END IF;

  FOR _q IN SELECT * FROM quiz_questions WHERE quiz_id = _quiz_id LOOP
    _total := _total + 1;
    _ans := COALESCE(_answers -> _q.id::text, 'null'::jsonb);
    _correct := false;

    IF _q.type IN ('single','multi','true_false') THEN
      IF jsonb_typeof(_ans) = 'array' THEN
        _given_arr := ARRAY(SELECT jsonb_array_elements_text(_ans)::int);
        _correct := (SELECT array_agg(x ORDER BY x) FROM unnest(_given_arr) x)
                    IS NOT DISTINCT FROM
                    (SELECT array_agg(x ORDER BY x) FROM unnest(_q.correct_indices) x);
      END IF;
    ELSIF _q.type = 'fill_blank' THEN
      IF jsonb_typeof(_ans) = 'string' THEN
        _norm := lower(trim(_ans #>> '{}'));
        _correct := EXISTS(SELECT 1 FROM unnest(_q.correct_text) c WHERE lower(trim(c)) = _norm);
      END IF;
    ELSIF _q.type = 'ordering' THEN
      IF jsonb_typeof(_ans) = 'array' THEN
        _given_arr := ARRAY(SELECT jsonb_array_elements_text(_ans)::int);
        _correct := _given_arr IS NOT DISTINCT FROM _q.correct_order;
      END IF;
    END IF;

    IF _correct THEN
      _score := _score + 1;
      _earned := _earned + _q.points;
    END IF;
  END LOOP;

  IF _total > 0 AND _score = _total THEN _earned := _earned + 50; END IF;
  IF _quiz.time_limit_seconds > 0 AND _time_taken < (_quiz.time_limit_seconds / 2) THEN
    _earned := _earned + 20;
  END IF;

  INSERT INTO quiz_attempts(user_id, quiz_id, score, total, time_taken_seconds,
                            points_awarded, answers, ip_address, fingerprint, user_agent)
    VALUES (_user, _quiz_id, _score, _total, _time_taken, _earned, _answers,
            NULLIF(_ip,''), NULLIF(_fingerprint,''), NULLIF(_ua,''))
    RETURNING id INTO _attempt_id;

  SELECT MAX(completed_at) INTO _last_attempt FROM quiz_attempts
    WHERE user_id = _user AND id <> _attempt_id;
  SELECT streak INTO _streak FROM profiles WHERE id = _user;
  IF _last_attempt IS NULL OR _last_attempt::date < (_now::date - 1) THEN
    _streak := 1;
  ELSIF _last_attempt::date = (_now::date - 1) THEN
    _streak := COALESCE(_streak,0) + 1;
  END IF;
  UPDATE profiles SET
    points = points + _earned,
    level  = GREATEST(1, ((points + _earned) / 500) + 1),
    streak = _streak,
    updated_at = now()
  WHERE id = _user;

  SELECT 1 + COUNT(*) INTO _rank FROM quiz_attempts
    WHERE quiz_id = _quiz_id AND id <> _attempt_id
      AND (score > _score OR (score = _score AND time_taken_seconds < _time_taken));

  IF (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = _user) = 1 THEN
    _new_badges := _new_badges || jsonb_build_object('code','first_quiz','at',_now);
  END IF;
  IF _total > 0 AND _score = _total THEN
    _new_badges := _new_badges || jsonb_build_object('code','perfect_score','quiz_id',_quiz_id,'at',_now);
  END IF;
  IF _rank = 1 THEN _new_badges := _new_badges || jsonb_build_object('code','gold','quiz_id',_quiz_id,'at',_now);
  ELSIF _rank = 2 THEN _new_badges := _new_badges || jsonb_build_object('code','silver','quiz_id',_quiz_id,'at',_now);
  ELSIF _rank = 3 THEN _new_badges := _new_badges || jsonb_build_object('code','bronze','quiz_id',_quiz_id,'at',_now);
  END IF;
  IF _streak >= 7 THEN _new_badges := _new_badges || jsonb_build_object('code','streak_7','at',_now); END IF;
  IF _streak >= 30 THEN _new_badges := _new_badges || jsonb_build_object('code','streak_30','at',_now); END IF;

  IF jsonb_array_length(_new_badges) > 0 THEN
    UPDATE profiles SET badges = COALESCE(badges,'[]'::jsonb) || _new_badges WHERE id = _user;
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', _attempt_id,
    'score', _score,
    'total', _total,
    'points_awarded', _earned,
    'rank', _rank,
    'new_badges', _new_badges
  );
END $function$;

-- 3. Quiz media bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('quiz-media', 'quiz-media', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "quiz-media public read" ON storage.objects;
CREATE POLICY "quiz-media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quiz-media');

DROP POLICY IF EXISTS "quiz-media staff insert" ON storage.objects;
CREATE POLICY "quiz-media staff insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quiz-media' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar')));

DROP POLICY IF EXISTS "quiz-media staff update" ON storage.objects;
CREATE POLICY "quiz-media staff update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'quiz-media' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar')));

DROP POLICY IF EXISTS "quiz-media staff delete" ON storage.objects;
CREATE POLICY "quiz-media staff delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'quiz-media' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar')));