
-- 1. Add lock flag to questions
ALTER TABLE public.qa_questions
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- 2. Badges table
CREATE TABLE IF NOT EXISTS public.qa_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, code)
);

ALTER TABLE public.qa_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qa_badges read all" ON public.qa_badges;
CREATE POLICY "qa_badges read all" ON public.qa_badges FOR SELECT USING (true);

-- Inserts only via SECURITY DEFINER functions; no direct insert/update/delete policies.

-- 3. Award helper
CREATE OR REPLACE FUNCTION public._qa_award_badge(_user uuid, _code text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _inserted boolean := false;
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;
  INSERT INTO qa_badges(user_id, code, meta) VALUES (_user, _code, _meta)
    ON CONFLICT (user_id, code) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted > 0;
END $$;

-- 4. Awarding triggers

-- Curious: first question
CREATE OR REPLACE FUNCTION public._qa_badge_after_question()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qa_award_badge(NEW.user_id, 'curious');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS qa_badge_after_question ON public.qa_questions;
CREATE TRIGGER qa_badge_after_question
AFTER INSERT ON public.qa_questions
FOR EACH ROW EXECUTE FUNCTION public._qa_badge_after_question();

-- Streak Sage: 7-day answer streak (uses profiles.qa_answer_streak which is updated by existing trigger)
CREATE OR REPLACE FUNCTION public._qa_badge_after_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _streak int;
BEGIN
  SELECT qa_answer_streak INTO _streak FROM profiles WHERE id = NEW.user_id;
  IF _streak IS NOT NULL AND _streak >= 7 THEN
    PERFORM _qa_award_badge(NEW.user_id, 'streak_sage');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS qa_badge_after_answer ON public.qa_answers;
CREATE TRIGGER qa_badge_after_answer
AFTER INSERT ON public.qa_answers
FOR EACH ROW EXECUTE FUNCTION public._qa_badge_after_answer();

-- Helpful (first accepted) + Teacher (10 accepted) + Scholar's Pick (first endorsement)
CREATE OR REPLACE FUNCTION public._qa_badge_after_answer_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _accepted_count int;
BEGIN
  IF NEW.is_accepted AND NOT OLD.is_accepted THEN
    SELECT COUNT(*) INTO _accepted_count FROM qa_answers WHERE user_id = NEW.user_id AND is_accepted = true;
    IF _accepted_count = 1 THEN PERFORM _qa_award_badge(NEW.user_id, 'helpful'); END IF;
    IF _accepted_count >= 10 THEN PERFORM _qa_award_badge(NEW.user_id, 'teacher'); END IF;
  END IF;
  IF NEW.is_scholar_endorsed AND NOT OLD.is_scholar_endorsed THEN
    PERFORM _qa_award_badge(NEW.user_id, 'scholars_pick');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS qa_badge_after_answer_update ON public.qa_answers;
CREATE TRIGGER qa_badge_after_answer_update
AFTER UPDATE ON public.qa_answers
FOR EACH ROW EXECUTE FUNCTION public._qa_badge_after_answer_update();

-- 5. Daily bonus claim
CREATE OR REPLACE FUNCTION public.qa_claim_daily_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _row qa_daily_quests%ROWTYPE;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _row FROM qa_daily_quests WHERE user_id = _user AND date = current_date;
  IF NOT FOUND THEN RAISE EXCEPTION 'No quest progress yet'; END IF;
  IF _row.bonus_claimed THEN RAISE EXCEPTION 'Already claimed today'; END IF;
  IF _row.answered < 1 OR _row.upvoted < 3 OR _row.asked < 1 THEN
    RAISE EXCEPTION 'Quests not all complete';
  END IF;
  UPDATE qa_daily_quests SET bonus_claimed = true WHERE user_id = _user AND date = current_date;
  PERFORM _qa_add_rep(_user, 10, 'daily_quest_bonus', 'quest', NULL);
  RETURN jsonb_build_object('rep_awarded', 10);
END $$;
