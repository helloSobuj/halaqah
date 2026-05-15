
-- ============ TOURNAMENTS (single-quiz bracket) ============
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_bn text NOT NULL,
  description_en text,
  description_bn text,
  bracket_size int NOT NULL DEFAULT 8 CHECK (bracket_size IN (4,8,16,32)),
  registration_opens_at timestamptz NOT NULL DEFAULT now(),
  registration_closes_at timestamptz NOT NULL,
  starts_at timestamptz NOT NULL,
  round_minutes int NOT NULL DEFAULT 30,
  prize_en text,
  prize_bn text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','in_progress','finished','cancelled')),
  current_round int NOT NULL DEFAULT 0,
  winner_user_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournaments visible to all" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Staff manage tournaments insert" ON public.tournaments FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'scholar'));
CREATE POLICY "Staff manage tournaments update" ON public.tournaments FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'scholar'));
CREATE POLICY "Admins delete tournaments" ON public.tournaments FOR DELETE USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_tournaments_updated BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tournament_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  seed int,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','active','eliminated','winner')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants visible to all" ON public.tournament_participants FOR SELECT USING (true);
CREATE POLICY "Users join tournaments" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave own registration" ON public.tournament_participants FOR DELETE USING (auth.uid() = user_id AND status='registered');
CREATE POLICY "Staff update participants" ON public.tournament_participants FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'scholar'));

CREATE TABLE public.tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round int NOT NULL,
  match_index int NOT NULL,
  p1_user_id uuid,
  p2_user_id uuid,
  p1_score int,
  p2_score int,
  p1_time_seconds int,
  p2_time_seconds int,
  p1_attempt_id uuid,
  p2_attempt_id uuid,
  winner_user_id uuid,
  next_match_id uuid,
  next_slot int CHECK (next_slot IN (1,2)),
  starts_at timestamptz,
  closes_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','live','finished','bye')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, round, match_index)
);
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches visible to all" ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "Staff manage matches" ON public.tournament_matches FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'scholar')) WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'scholar'));

-- Seed bracket: build matches in reverse, link next_match pointers
CREATE OR REPLACE FUNCTION public.start_tournament(_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _t tournaments%ROWTYPE;
  _participants uuid[];
  _n int;
  _size int;
  _rounds int;
  _r int;
  _matches_in_round int;
  _i int;
  _match_id uuid;
  _round_ids uuid[];
  _prev_round_ids uuid[];
  _now timestamptz := now();
  _round_start timestamptz;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'scholar')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO _t FROM tournaments WHERE id=_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF _t.status NOT IN ('draft','open') THEN RAISE EXCEPTION 'Already started'; END IF;

  SELECT array_agg(user_id ORDER BY joined_at) INTO _participants
    FROM tournament_participants WHERE tournament_id=_tournament_id;
  _n := COALESCE(array_length(_participants,1),0);
  IF _n < 2 THEN RAISE EXCEPTION 'Need at least 2 participants'; END IF;

  _size := _t.bracket_size;
  WHILE _size < _n LOOP _size := _size * 2; END LOOP;
  _rounds := (ln(_size)/ln(2))::int;

  -- Delete any prior bracket
  DELETE FROM tournament_matches WHERE tournament_id=_tournament_id;

  -- Build rounds from final back to round 1
  _prev_round_ids := ARRAY[]::uuid[];
  FOR _r IN REVERSE _rounds..1 LOOP
    _matches_in_round := _size / (2 ^ _r)::int;
    _round_ids := ARRAY[]::uuid[];
    _round_start := _t.starts_at + ((_rounds - _r) * _t.round_minutes || ' minutes')::interval;
    FOR _i IN 0.._matches_in_round-1 LOOP
      INSERT INTO tournament_matches(tournament_id, round, match_index, status, starts_at, closes_at,
                                      next_match_id, next_slot)
        VALUES (_tournament_id, _r, _i, 'pending', _round_start,
                _round_start + (_t.round_minutes || ' minutes')::interval,
                CASE WHEN array_length(_prev_round_ids,1) IS NULL THEN NULL
                     ELSE _prev_round_ids[(_i / 2) + 1] END,
                CASE WHEN array_length(_prev_round_ids,1) IS NULL THEN NULL
                     ELSE (_i % 2) + 1 END)
        RETURNING id INTO _match_id;
      _round_ids := _round_ids || _match_id;
    END LOOP;
    _prev_round_ids := _round_ids;
  END LOOP;

  -- Seed round 1 with participants (and byes for empty slots)
  _matches_in_round := _size / 2;
  FOR _i IN 0.._matches_in_round-1 LOOP
    UPDATE tournament_matches SET
      p1_user_id = CASE WHEN (_i*2)+1 <= _n THEN _participants[(_i*2)+1] ELSE NULL END,
      p2_user_id = CASE WHEN (_i*2)+2 <= _n THEN _participants[(_i*2)+2] ELSE NULL END,
      status = CASE
        WHEN (_i*2)+1 > _n THEN 'finished'
        WHEN (_i*2)+2 > _n THEN 'bye'
        ELSE 'live'
      END,
      winner_user_id = CASE WHEN (_i*2)+2 > _n AND (_i*2)+1 <= _n THEN _participants[(_i*2)+1] ELSE NULL END
    WHERE tournament_id=_tournament_id AND round=1 AND match_index=_i;
  END LOOP;

  -- Advance byes to round 2
  PERFORM public._advance_byes(_tournament_id);

  UPDATE tournaments SET status='in_progress', current_round=1, updated_at=now() WHERE id=_tournament_id;
  UPDATE tournament_participants SET status='active' WHERE tournament_id=_tournament_id;

  RETURN jsonb_build_object('rounds',_rounds,'size',_size,'participants',_n);
END $$;

CREATE OR REPLACE FUNCTION public._advance_byes(_tournament_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _m tournament_matches%ROWTYPE;
BEGIN
  FOR _m IN SELECT * FROM tournament_matches
    WHERE tournament_id=_tournament_id AND status IN ('bye','finished') AND winner_user_id IS NOT NULL AND next_match_id IS NOT NULL
  LOOP
    IF _m.next_slot=1 THEN
      UPDATE tournament_matches SET p1_user_id=_m.winner_user_id WHERE id=_m.next_match_id;
    ELSE
      UPDATE tournament_matches SET p2_user_id=_m.winner_user_id WHERE id=_m.next_match_id;
    END IF;
  END LOOP;
  -- Mark next round matches with both players as live
  UPDATE tournament_matches SET status='live'
    WHERE tournament_id=_tournament_id AND status='pending'
      AND p1_user_id IS NOT NULL AND p2_user_id IS NOT NULL;
END $$;

CREATE OR REPLACE FUNCTION public.submit_tournament_match(_match_id uuid, _attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _user uuid := auth.uid();
  _m tournament_matches%ROWTYPE;
  _a quiz_attempts%ROWTYPE;
  _winner uuid;
  _both_done boolean := false;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _m FROM tournament_matches WHERE id=_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF _m.status NOT IN ('live','pending') THEN RAISE EXCEPTION 'Match not live'; END IF;
  SELECT * INTO _a FROM quiz_attempts WHERE id=_attempt_id AND user_id=_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;

  IF _m.p1_user_id = _user THEN
    UPDATE tournament_matches SET p1_score=_a.score, p1_time_seconds=_a.time_taken_seconds, p1_attempt_id=_a.id WHERE id=_match_id;
    _m.p1_score := _a.score; _m.p1_time_seconds := _a.time_taken_seconds;
  ELSIF _m.p2_user_id = _user THEN
    UPDATE tournament_matches SET p2_score=_a.score, p2_time_seconds=_a.time_taken_seconds, p2_attempt_id=_a.id WHERE id=_match_id;
    _m.p2_score := _a.score; _m.p2_time_seconds := _a.time_taken_seconds;
  ELSE
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  IF _m.p1_score IS NOT NULL AND _m.p2_score IS NOT NULL THEN
    _both_done := true;
    IF _m.p1_score > _m.p2_score THEN _winner := _m.p1_user_id;
    ELSIF _m.p2_score > _m.p1_score THEN _winner := _m.p2_user_id;
    ELSIF COALESCE(_m.p1_time_seconds,999999) < COALESCE(_m.p2_time_seconds,999999) THEN _winner := _m.p1_user_id;
    ELSE _winner := _m.p2_user_id;
    END IF;
    UPDATE tournament_matches SET winner_user_id=_winner, status='finished' WHERE id=_match_id;
    UPDATE tournament_participants SET status='eliminated'
      WHERE tournament_id=_m.tournament_id
        AND user_id IN (_m.p1_user_id,_m.p2_user_id)
        AND user_id <> _winner;
    IF _m.next_match_id IS NOT NULL THEN
      IF _m.next_slot=1 THEN UPDATE tournament_matches SET p1_user_id=_winner WHERE id=_m.next_match_id;
      ELSE UPDATE tournament_matches SET p2_user_id=_winner WHERE id=_m.next_match_id; END IF;
      UPDATE tournament_matches SET status='live'
        WHERE id=_m.next_match_id AND p1_user_id IS NOT NULL AND p2_user_id IS NOT NULL;
    ELSE
      -- Final
      UPDATE tournaments SET status='finished', winner_user_id=_winner, updated_at=now() WHERE id=_m.tournament_id;
      UPDATE tournament_participants SET status='winner' WHERE tournament_id=_m.tournament_id AND user_id=_winner;
    END IF;
  END IF;
  RETURN jsonb_build_object('both_done',_both_done,'winner',_winner);
END $$;

-- ============ REMINDERS + PUSH ============
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subs" ON public.push_subscriptions FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Users insert own subs" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Users delete own subs" ON public.push_subscriptions FOR DELETE USING (auth.uid()=user_id);

CREATE TABLE public.quiz_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  remind_at timestamptz NOT NULL,
  channels text[] NOT NULL DEFAULT ARRAY['in_app'],
  message_en text,
  message_bn text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (quiz_id IS NOT NULL OR tournament_id IS NOT NULL)
);
ALTER TABLE public.quiz_reminders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reminders_due ON public.quiz_reminders(remind_at) WHERE sent_at IS NULL;
CREATE INDEX idx_reminders_user ON public.quiz_reminders(user_id);
CREATE POLICY "Users view own reminders" ON public.quiz_reminders FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Users insert own reminders" ON public.quiz_reminders FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Users update own reminders" ON public.quiz_reminders FOR UPDATE USING (auth.uid()=user_id);
CREATE POLICY "Users delete own reminders" ON public.quiz_reminders FOR DELETE USING (auth.uid()=user_id);

-- Auto-create reminders when quiz has starts_at and tournament registration
CREATE OR REPLACE FUNCTION public.set_quiz_reminder(_quiz_id uuid, _minutes_before int DEFAULT 15)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _user uuid := auth.uid();
  _starts timestamptz;
  _id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT starts_at INTO _starts FROM quizzes WHERE id=_quiz_id AND published=true;
  IF _starts IS NULL THEN RAISE EXCEPTION 'Quiz has no scheduled start'; END IF;
  DELETE FROM quiz_reminders WHERE user_id=_user AND quiz_id=_quiz_id AND sent_at IS NULL;
  INSERT INTO quiz_reminders(user_id, quiz_id, remind_at, channels)
    VALUES (_user, _quiz_id, _starts - (_minutes_before || ' minutes')::interval, ARRAY['in_app','push'])
    RETURNING id INTO _id;
  RETURN _id;
END $$;