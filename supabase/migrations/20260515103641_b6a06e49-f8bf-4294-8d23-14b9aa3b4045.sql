
-- ============ QUIZ MODULE ============

-- Categories
CREATE TABLE public.quiz_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.quiz_categories(id) ON DELETE SET NULL,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  description_en TEXT,
  description_bn TEXT,
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard')),
  time_limit_seconds INT NOT NULL DEFAULT 600,
  pass_mark INT NOT NULL DEFAULT 60,
  instant_feedback BOOLEAN NOT NULL DEFAULT false,
  max_attempts INT NOT NULL DEFAULT 1,    -- 0 = unlimited
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quizzes_category ON public.quizzes(category_id);
CREATE INDEX idx_quizzes_published ON public.quizzes(published);

-- Questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'single' CHECK (type IN ('single','multi')),
  text_en TEXT NOT NULL,
  text_bn TEXT NOT NULL,
  options_en JSONB NOT NULL DEFAULT '[]'::jsonb,
  options_bn JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_indices INT[] NOT NULL DEFAULT '{}',
  explanation_en TEXT,
  explanation_bn TEXT,
  points INT NOT NULL DEFAULT 10,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_questions_quiz_order ON public.quiz_questions(quiz_id, order_index);

-- Attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  time_taken_seconds INT NOT NULL DEFAULT 0,
  points_awarded INT NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  fingerprint TEXT,
  user_agent TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempts_user ON public.quiz_attempts(user_id, completed_at DESC);
CREATE INDEX idx_attempts_quiz_score ON public.quiz_attempts(quiz_id, score DESC);
CREATE INDEX idx_attempts_quiz_fingerprint ON public.quiz_attempts(quiz_id, fingerprint);
CREATE INDEX idx_attempts_quiz_ip ON public.quiz_attempts(quiz_id, ip_address);

-- Bookmarks
CREATE TABLE public.quiz_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

-- updated_at triggers
CREATE TRIGGER trg_quiz_categories_updated BEFORE UPDATE ON public.quiz_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_quizzes_updated BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RLS ============
ALTER TABLE public.quiz_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bookmarks ENABLE ROW LEVEL SECURITY;

-- Categories: public read, staff write
CREATE POLICY "Categories viewable by all" ON public.quiz_categories FOR SELECT USING (true);
CREATE POLICY "Staff insert categories" ON public.quiz_categories FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar'));
CREATE POLICY "Staff update categories" ON public.quiz_categories FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar'));
CREATE POLICY "Admin delete categories" ON public.quiz_categories FOR DELETE
  USING (public.has_role(auth.uid(),'admin'));

-- Quizzes: published public; staff full
CREATE POLICY "Published quizzes public" ON public.quizzes FOR SELECT
  USING (published = true OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'scholar'));
CREATE POLICY "Staff insert quizzes" ON public.quizzes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar'));
CREATE POLICY "Staff update quizzes" ON public.quizzes FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar')
         OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Admin delete quizzes" ON public.quizzes FOR DELETE
  USING (public.has_role(auth.uid(),'admin'));

-- Questions: visible if parent quiz published or staff
CREATE POLICY "Questions visible if quiz published" ON public.quiz_questions FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.published = true)
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
    OR public.has_role(auth.uid(),'scholar')
  );
CREATE POLICY "Staff insert questions" ON public.quiz_questions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar'));
CREATE POLICY "Staff update questions" ON public.quiz_questions FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar'));
CREATE POLICY "Staff delete questions" ON public.quiz_questions FOR DELETE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'scholar'));

-- Attempts: own + staff read
CREATE POLICY "Users view own attempts" ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Users insert own attempts" ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Bookmarks: own
CREATE POLICY "Users view own bookmarks" ON public.quiz_bookmarks FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bookmarks" ON public.quiz_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own bookmarks" ON public.quiz_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- ============ RPCs ============

-- submit attempt: server-side scoring + gamification
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  _quiz_id UUID,
  _answers JSONB,
  _time_taken INT,
  _ip TEXT,
  _fingerprint TEXT,
  _ua TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user UUID := auth.uid();
  _quiz quizzes%ROWTYPE;
  _q quiz_questions%ROWTYPE;
  _given INT[];
  _correct INT;
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
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _quiz FROM quizzes WHERE id = _quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF NOT _quiz.published THEN RAISE EXCEPTION 'Quiz not published'; END IF;
  IF _quiz.starts_at IS NOT NULL AND _now < _quiz.starts_at THEN RAISE EXCEPTION 'Quiz not started'; END IF;
  IF _quiz.ends_at IS NOT NULL AND _now > _quiz.ends_at THEN RAISE EXCEPTION 'Quiz ended'; END IF;

  -- attempt limit (per user OR per ip OR per fingerprint)
  IF _quiz.max_attempts > 0 THEN
    SELECT COUNT(*) INTO _attempt_count FROM quiz_attempts
      WHERE quiz_id = _quiz_id
        AND (user_id = _user
             OR (_ip IS NOT NULL AND ip_address = _ip)
             OR (_fingerprint IS NOT NULL AND fingerprint = _fingerprint));
    IF _attempt_count >= _quiz.max_attempts THEN
      RAISE EXCEPTION 'Attempt limit reached';
    END IF;
  END IF;

  -- score
  FOR _q IN SELECT * FROM quiz_questions WHERE quiz_id = _quiz_id LOOP
    _total := _total + 1;
    _given := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_answers->_q.id::text, '[]'::jsonb))::int);
    IF (SELECT array_agg(x ORDER BY x) FROM unnest(_given) x)
       IS NOT DISTINCT FROM
       (SELECT array_agg(x ORDER BY x) FROM unnest(_q.correct_indices) x)
    THEN
      _score := _score + 1;
      _earned := _earned + _q.points;
    END IF;
  END LOOP;

  -- speed bonus + perfect bonus
  IF _total > 0 AND _score = _total THEN
    _earned := _earned + 50;
  END IF;
  IF _quiz.time_limit_seconds > 0 AND _time_taken < (_quiz.time_limit_seconds / 2) THEN
    _earned := _earned + 20;
  END IF;

  INSERT INTO quiz_attempts(user_id, quiz_id, score, total, time_taken_seconds,
                            points_awarded, answers, ip_address, fingerprint, user_agent)
    VALUES (_user, _quiz_id, _score, _total, _time_taken, _earned, _answers, _ip, _fingerprint, _ua)
    RETURNING id INTO _attempt_id;

  -- update profile points + level + streak
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

  -- rank for this attempt
  SELECT 1 + COUNT(*) INTO _rank FROM quiz_attempts
    WHERE quiz_id = _quiz_id AND id <> _attempt_id
      AND (score > _score OR (score = _score AND time_taken_seconds < _time_taken));

  -- award badges
  IF (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = _user) = 1 THEN
    _new_badges := _new_badges || jsonb_build_object('code','first_quiz','at',_now);
  END IF;
  IF _total > 0 AND _score = _total THEN
    _new_badges := _new_badges || jsonb_build_object('code','perfect_score','quiz_id',_quiz_id,'at',_now);
  END IF;
  IF _rank = 1 THEN
    _new_badges := _new_badges || jsonb_build_object('code','gold','quiz_id',_quiz_id,'at',_now);
  ELSIF _rank = 2 THEN
    _new_badges := _new_badges || jsonb_build_object('code','silver','quiz_id',_quiz_id,'at',_now);
  ELSIF _rank = 3 THEN
    _new_badges := _new_badges || jsonb_build_object('code','bronze','quiz_id',_quiz_id,'at',_now);
  END IF;
  IF _streak >= 7 THEN
    _new_badges := _new_badges || jsonb_build_object('code','streak_7','at',_now);
  END IF;
  IF _streak >= 30 THEN
    _new_badges := _new_badges || jsonb_build_object('code','streak_30','at',_now);
  END IF;

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
END $$;

-- leaderboard
CREATE OR REPLACE FUNCTION public.get_quiz_leaderboard(
  _quiz_id UUID DEFAULT NULL,
  _category_id UUID DEFAULT NULL,
  _period TEXT DEFAULT 'all'
) RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_score BIGINT,
  total_points BIGINT,
  attempts BIGINT,
  best_time INT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.user_id,
    p.display_name,
    p.avatar_url,
    SUM(a.score)::bigint AS total_score,
    SUM(a.points_awarded)::bigint AS total_points,
    COUNT(*)::bigint AS attempts,
    MIN(a.time_taken_seconds) AS best_time
  FROM quiz_attempts a
  LEFT JOIN profiles p ON p.id = a.user_id
  LEFT JOIN quizzes q ON q.id = a.quiz_id
  WHERE (_quiz_id IS NULL OR a.quiz_id = _quiz_id)
    AND (_category_id IS NULL OR q.category_id = _category_id)
    AND (
      _period = 'all'
      OR (_period = 'week' AND a.completed_at >= now() - interval '7 days')
      OR (_period = 'month' AND a.completed_at >= now() - interval '30 days')
    )
  GROUP BY a.user_id, p.display_name, p.avatar_url
  ORDER BY total_points DESC, total_score DESC, best_time ASC
  LIMIT 50
$$;

-- check attempts left for current user
CREATE OR REPLACE FUNCTION public.attempts_left(_quiz_id UUID, _ip TEXT, _fingerprint TEXT)
RETURNS INT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _max INT; _used INT; _user UUID := auth.uid();
BEGIN
  SELECT max_attempts INTO _max FROM quizzes WHERE id = _quiz_id;
  IF _max IS NULL THEN RETURN 0; END IF;
  IF _max = 0 THEN RETURN -1; END IF;
  SELECT COUNT(*) INTO _used FROM quiz_attempts
    WHERE quiz_id = _quiz_id
      AND (user_id = _user
           OR (_ip IS NOT NULL AND ip_address = _ip)
           OR (_fingerprint IS NOT NULL AND fingerprint = _fingerprint));
  RETURN GREATEST(0, _max - _used);
END $$;

-- seed a couple of categories
INSERT INTO public.quiz_categories(slug, name_en, name_bn, icon, color, sort_order) VALUES
  ('quran',   'Quran',   'কুরআন',     'book-open', '#15803d', 1),
  ('hadith',  'Hadith',  'হাদিস',     'scroll',    '#0e7490', 2),
  ('fiqh',    'Fiqh',    'ফিকহ',      'scale',     '#7c3aed', 3),
  ('seerah',  'Seerah',  'সীরাত',     'star',      '#b45309', 4);
