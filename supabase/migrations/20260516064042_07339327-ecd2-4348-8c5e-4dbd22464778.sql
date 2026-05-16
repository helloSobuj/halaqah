
-- ============ Profiles additions ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qa_reputation int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qa_answer_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qa_last_answered_on date;

-- ============ Categories ============
CREATE TABLE public.qa_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_bn text NOT NULL,
  icon text,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_categories read all" ON public.qa_categories FOR SELECT USING (true);
CREATE POLICY "qa_categories admin manage" ON public.qa_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ============ Tags ============
CREATE TABLE public.qa_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  usage_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_tags read all" ON public.qa_tags FOR SELECT USING (true);
CREATE POLICY "qa_tags auth insert" ON public.qa_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "qa_tags staff update" ON public.qa_tags FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- ============ Questions ============
CREATE TABLE public.qa_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid REFERENCES public.qa_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  body_md text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  duplicate_of uuid,
  view_count int NOT NULL DEFAULT 0,
  answer_count int NOT NULL DEFAULT 0,
  vote_score int NOT NULL DEFAULT 0,
  accepted_answer_id uuid,
  scholar_review_required boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body_md,'')), 'B')
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qa_questions_search_idx ON public.qa_questions USING GIN(search_tsv);
CREATE INDEX qa_questions_user_idx ON public.qa_questions(user_id);
CREATE INDEX qa_questions_category_idx ON public.qa_questions(category_id);
CREATE INDEX qa_questions_activity_idx ON public.qa_questions(last_activity_at DESC);
ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_questions read all" ON public.qa_questions FOR SELECT USING (true);
CREATE POLICY "qa_questions auth insert" ON public.qa_questions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qa_questions owner update" ON public.qa_questions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'));
CREATE POLICY "qa_questions owner delete" ON public.qa_questions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE TABLE public.qa_question_tags (
  question_id uuid NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.qa_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);
ALTER TABLE public.qa_question_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_question_tags read all" ON public.qa_question_tags FOR SELECT USING (true);
CREATE POLICY "qa_question_tags auth manage" ON public.qa_question_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qa_questions q WHERE q.id = question_id AND (q.user_id = auth.uid() OR has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.qa_questions q WHERE q.id = question_id AND (q.user_id = auth.uid() OR has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'))));

-- ============ Answers ============
CREATE TABLE public.qa_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body_md text NOT NULL,
  vote_score int NOT NULL DEFAULT 0,
  is_accepted boolean NOT NULL DEFAULT false,
  is_scholar_endorsed boolean NOT NULL DEFAULT false,
  endorsed_by uuid,
  endorsed_at timestamptz,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);
CREATE INDEX qa_answers_question_idx ON public.qa_answers(question_id);
CREATE INDEX qa_answers_user_idx ON public.qa_answers(user_id);
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_answers read all" ON public.qa_answers FOR SELECT USING (true);
CREATE POLICY "qa_answers auth insert" ON public.qa_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qa_answers owner update" ON public.qa_answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'));
CREATE POLICY "qa_answers owner delete" ON public.qa_answers FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

-- ============ Comments ============
CREATE TABLE public.qa_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type text NOT NULL CHECK (parent_type IN ('question','answer')),
  parent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qa_comments_parent_idx ON public.qa_comments(parent_type, parent_id);
ALTER TABLE public.qa_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_comments read all" ON public.qa_comments FOR SELECT USING (true);
CREATE POLICY "qa_comments auth insert" ON public.qa_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qa_comments owner delete" ON public.qa_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'));

-- ============ Votes ============
CREATE TABLE public.qa_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('question','answer')),
  target_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1,1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
CREATE INDEX qa_votes_target_idx ON public.qa_votes(target_type, target_id);
ALTER TABLE public.qa_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_votes read all" ON public.qa_votes FOR SELECT USING (true);
-- writes go through SECURITY DEFINER fn only
CREATE POLICY "qa_votes self read" ON public.qa_votes FOR SELECT USING (auth.uid() = user_id);

-- ============ Follows / bookmarks ============
CREATE TABLE public.qa_follows (
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
ALTER TABLE public.qa_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_follows self all" ON public.qa_follows FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ Flags ============
CREATE TABLE public.qa_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('question','answer','comment')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_flags self insert" ON public.qa_flags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qa_flags staff read" ON public.qa_flags FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'));
CREATE POLICY "qa_flags staff update" ON public.qa_flags FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'));

-- ============ Reputation ledger ============
CREATE TABLE public.qa_reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta int NOT NULL,
  reason text NOT NULL,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qa_rep_user_idx ON public.qa_reputation_events(user_id, created_at DESC);
ALTER TABLE public.qa_reputation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_rep self read" ON public.qa_reputation_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

-- ============ Daily quests ============
CREATE TABLE public.qa_daily_quests (
  user_id uuid NOT NULL,
  date date NOT NULL,
  answered int NOT NULL DEFAULT 0,
  upvoted int NOT NULL DEFAULT 0,
  asked int NOT NULL DEFAULT 0,
  bonus_claimed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, date)
);
ALTER TABLE public.qa_daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_daily_quests self all" ON public.qa_daily_quests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ Triggers: updated_at ============
CREATE TRIGGER qa_questions_updated_at BEFORE UPDATE ON public.qa_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER qa_answers_updated_at BEFORE UPDATE ON public.qa_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER qa_categories_updated_at BEFORE UPDATE ON public.qa_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Helper: add reputation ============
CREATE OR REPLACE FUNCTION public._qa_add_rep(_user uuid, _delta int, _reason text, _src_type text, _src_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _today_gained int;
BEGIN
  IF _user IS NULL OR _delta = 0 THEN RETURN; END IF;
  -- daily cap on positive vote-derived gains: 200/day
  IF _delta > 0 AND _reason IN ('q_upvoted','a_upvoted') THEN
    SELECT COALESCE(SUM(delta),0) INTO _today_gained
      FROM qa_reputation_events
      WHERE user_id=_user AND reason IN ('q_upvoted','a_upvoted')
        AND created_at >= date_trunc('day', now());
    IF _today_gained >= 200 THEN RETURN; END IF;
    IF _today_gained + _delta > 200 THEN _delta := 200 - _today_gained; END IF;
  END IF;
  INSERT INTO qa_reputation_events(user_id, delta, reason, source_type, source_id)
    VALUES (_user, _delta, _reason, _src_type, _src_id);
  UPDATE profiles SET qa_reputation = GREATEST(0, qa_reputation + _delta), updated_at=now() WHERE id=_user;
END $$;

-- ============ Cast vote ============
CREATE OR REPLACE FUNCTION public.qa_cast_vote(_target_type text, _target_id uuid, _value int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _existing smallint;
  _author uuid;
  _new_score int;
  _rep int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _value NOT IN (-1,0,1) THEN RAISE EXCEPTION 'Invalid vote'; END IF;
  IF _target_type NOT IN ('question','answer') THEN RAISE EXCEPTION 'Invalid target'; END IF;

  IF _value = -1 THEN
    SELECT qa_reputation INTO _rep FROM profiles WHERE id=_user;
    IF COALESCE(_rep,0) < 15 THEN RAISE EXCEPTION 'Need 15 reputation to downvote'; END IF;
  END IF;

  IF _target_type='question' THEN
    SELECT user_id INTO _author FROM qa_questions WHERE id=_target_id;
  ELSE
    SELECT user_id INTO _author FROM qa_answers WHERE id=_target_id;
  END IF;
  IF _author IS NULL THEN RAISE EXCEPTION 'Target not found'; END IF;
  IF _author = _user THEN RAISE EXCEPTION 'Cannot vote on your own post'; END IF;

  SELECT value INTO _existing FROM qa_votes
    WHERE user_id=_user AND target_type=_target_type AND target_id=_target_id;

  IF _value = 0 OR _existing = _value THEN
    -- remove
    IF _existing IS NOT NULL THEN
      DELETE FROM qa_votes WHERE user_id=_user AND target_type=_target_type AND target_id=_target_id;
      -- reverse reputation effect
      IF _existing = 1 THEN
        PERFORM _qa_add_rep(_author, CASE WHEN _target_type='question' THEN -10 ELSE -15 END,
                            CASE WHEN _target_type='question' THEN 'q_upvoted' ELSE 'a_upvoted' END,
                            _target_type, _target_id);
      ELSE
        PERFORM _qa_add_rep(_author, 5, 'downvote_removed', _target_type, _target_id);
        IF _target_type='answer' THEN
          PERFORM _qa_add_rep(_user, 2, 'downvote_cost_removed', _target_type, _target_id);
        END IF;
      END IF;
    END IF;
  ELSE
    INSERT INTO qa_votes(user_id, target_type, target_id, value)
      VALUES (_user, _target_type, _target_id, _value)
      ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET value=EXCLUDED.value;
    -- if switching, first reverse old effect
    IF _existing IS NOT NULL THEN
      IF _existing = 1 THEN
        PERFORM _qa_add_rep(_author, CASE WHEN _target_type='question' THEN -10 ELSE -15 END,
                            CASE WHEN _target_type='question' THEN 'q_upvoted' ELSE 'a_upvoted' END,
                            _target_type, _target_id);
      ELSE
        PERFORM _qa_add_rep(_author, 5, 'downvote_removed', _target_type, _target_id);
      END IF;
    END IF;
    -- apply new
    IF _value = 1 THEN
      PERFORM _qa_add_rep(_author, CASE WHEN _target_type='question' THEN 10 ELSE 15 END,
                          CASE WHEN _target_type='question' THEN 'q_upvoted' ELSE 'a_upvoted' END,
                          _target_type, _target_id);
      -- daily quest: upvote count
      INSERT INTO qa_daily_quests(user_id, date, upvoted) VALUES (_user, current_date, 1)
        ON CONFLICT (user_id, date) DO UPDATE SET upvoted = qa_daily_quests.upvoted + 1;
    ELSE
      PERFORM _qa_add_rep(_author, -5, 'downvoted', _target_type, _target_id);
      IF _target_type='answer' THEN
        PERFORM _qa_add_rep(_user, -2, 'downvote_cost', _target_type, _target_id);
      END IF;
    END IF;
  END IF;

  -- recompute score
  IF _target_type='question' THEN
    SELECT COALESCE(SUM(value),0) INTO _new_score FROM qa_votes WHERE target_type='question' AND target_id=_target_id;
    UPDATE qa_questions SET vote_score=_new_score, last_activity_at=now() WHERE id=_target_id;
  ELSE
    SELECT COALESCE(SUM(value),0) INTO _new_score FROM qa_votes WHERE target_type='answer' AND target_id=_target_id;
    UPDATE qa_answers SET vote_score=_new_score WHERE id=_target_id;
  END IF;

  RETURN jsonb_build_object('score', _new_score, 'my_value', (SELECT value FROM qa_votes WHERE user_id=_user AND target_type=_target_type AND target_id=_target_id));
END $$;

-- ============ Accept answer ============
CREATE OR REPLACE FUNCTION public.qa_accept_answer(_answer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _q qa_questions%ROWTYPE;
  _a qa_answers%ROWTYPE;
  _prev uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _a FROM qa_answers WHERE id=_answer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Answer not found'; END IF;
  SELECT * INTO _q FROM qa_questions WHERE id=_a.question_id;
  IF _q.user_id <> _user THEN RAISE EXCEPTION 'Only the asker can accept'; END IF;

  _prev := _q.accepted_answer_id;
  IF _prev = _answer_id THEN
    -- toggle off
    UPDATE qa_answers SET is_accepted=false WHERE id=_answer_id;
    UPDATE qa_questions SET accepted_answer_id=NULL, last_activity_at=now() WHERE id=_q.id;
    PERFORM _qa_add_rep(_a.user_id, -25, 'accept_removed', 'answer', _answer_id);
    PERFORM _qa_add_rep(_user, -5, 'unaccept_picked', 'answer', _answer_id);
    RETURN;
  END IF;

  IF _prev IS NOT NULL THEN
    UPDATE qa_answers SET is_accepted=false WHERE id=_prev;
    PERFORM _qa_add_rep((SELECT user_id FROM qa_answers WHERE id=_prev), -25, 'accept_removed', 'answer', _prev);
  END IF;
  UPDATE qa_answers SET is_accepted=true WHERE id=_answer_id;
  UPDATE qa_questions SET accepted_answer_id=_answer_id, last_activity_at=now() WHERE id=_q.id;
  PERFORM _qa_add_rep(_a.user_id, 25, 'answer_accepted', 'answer', _answer_id);
  IF _prev IS NULL THEN
    PERFORM _qa_add_rep(_user, 5, 'accepted_pick', 'answer', _answer_id);
  END IF;
END $$;

-- ============ Endorse answer (scholar) ============
CREATE OR REPLACE FUNCTION public.qa_endorse_answer(_answer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _a qa_answers%ROWTYPE;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_user,'scholar') OR has_role(_user,'admin')) THEN
    RAISE EXCEPTION 'Scholar role required';
  END IF;
  SELECT * INTO _a FROM qa_answers WHERE id=_answer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Answer not found'; END IF;
  IF _a.is_scholar_endorsed THEN
    UPDATE qa_answers SET is_scholar_endorsed=false, endorsed_by=NULL, endorsed_at=NULL WHERE id=_answer_id;
    PERFORM _qa_add_rep(_a.user_id, -50, 'endorse_removed', 'answer', _answer_id);
  ELSE
    UPDATE qa_answers SET is_scholar_endorsed=true, endorsed_by=_user, endorsed_at=now() WHERE id=_answer_id;
    PERFORM _qa_add_rep(_a.user_id, 50, 'scholar_endorsed', 'answer', _answer_id);
  END IF;
END $$;

-- ============ After-insert triggers ============
CREATE OR REPLACE FUNCTION public._qa_after_question_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO qa_daily_quests(user_id, date, asked) VALUES (NEW.user_id, current_date, 1)
    ON CONFLICT (user_id, date) DO UPDATE SET asked = qa_daily_quests.asked + 1;
  RETURN NEW;
END $$;
CREATE TRIGGER qa_after_question_insert AFTER INSERT ON public.qa_questions
  FOR EACH ROW EXECUTE FUNCTION public._qa_after_question_insert();

CREATE OR REPLACE FUNCTION public._qa_after_answer_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _last date; _streak int;
BEGIN
  UPDATE qa_questions SET answer_count = answer_count + 1, last_activity_at = now()
    WHERE id = NEW.question_id;
  INSERT INTO qa_daily_quests(user_id, date, answered) VALUES (NEW.user_id, current_date, 1)
    ON CONFLICT (user_id, date) DO UPDATE SET answered = qa_daily_quests.answered + 1;
  -- streak
  SELECT qa_last_answered_on, qa_answer_streak INTO _last, _streak FROM profiles WHERE id=NEW.user_id;
  IF _last IS NULL OR _last < current_date - 1 THEN _streak := 1;
  ELSIF _last = current_date - 1 THEN _streak := COALESCE(_streak,0) + 1;
  END IF;
  UPDATE profiles SET qa_last_answered_on=current_date, qa_answer_streak=_streak WHERE id=NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER qa_after_answer_insert AFTER INSERT ON public.qa_answers
  FOR EACH ROW EXECUTE FUNCTION public._qa_after_answer_insert();

CREATE OR REPLACE FUNCTION public._qa_after_answer_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE qa_questions SET answer_count = GREATEST(0, answer_count - 1) WHERE id = OLD.question_id;
  RETURN OLD;
END $$;
CREATE TRIGGER qa_after_answer_delete AFTER DELETE ON public.qa_answers
  FOR EACH ROW EXECUTE FUNCTION public._qa_after_answer_delete();

-- ============ Tag upsert helper ============
CREATE OR REPLACE FUNCTION public.qa_attach_tags(_question_id uuid, _labels text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _label text; _slug text; _tag_id uuid;
BEGIN
  IF _labels IS NULL THEN RETURN; END IF;
  FOREACH _label IN ARRAY _labels LOOP
    _slug := lower(regexp_replace(trim(_label), '[^a-zA-Z0-9]+', '-', 'g'));
    IF _slug = '' OR _slug IS NULL THEN CONTINUE; END IF;
    INSERT INTO qa_tags(slug, label) VALUES (_slug, trim(_label))
      ON CONFLICT (slug) DO UPDATE SET usage_count = qa_tags.usage_count + 1
      RETURNING id INTO _tag_id;
    INSERT INTO qa_question_tags(question_id, tag_id) VALUES (_question_id, _tag_id)
      ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============ Leaderboard ============
CREATE OR REPLACE FUNCTION public.qa_leaderboard(_period text DEFAULT 'all')
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, rep_gained bigint, total_rep int, answers bigint, accepted bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (
    SELECT user_id, SUM(delta)::bigint AS rep_gained
    FROM qa_reputation_events
    WHERE delta > 0 AND (
      _period = 'all'
      OR (_period = 'week'  AND created_at >= now() - interval '7 days')
      OR (_period = 'month' AND created_at >= now() - interval '30 days')
    )
    GROUP BY user_id
  )
  SELECT
    p.id, p.display_name, p.avatar_url,
    COALESCE(r.rep_gained,0),
    p.qa_reputation,
    (SELECT COUNT(*) FROM qa_answers a WHERE a.user_id=p.id AND a.is_deleted=false) AS answers,
    (SELECT COUNT(*) FROM qa_answers a WHERE a.user_id=p.id AND a.is_accepted=true) AS accepted
  FROM r JOIN profiles p ON p.id = r.user_id
  ORDER BY r.rep_gained DESC NULLS LAST, p.qa_reputation DESC
  LIMIT 50
$$;

-- ============ View bump ============
CREATE OR REPLACE FUNCTION public.qa_bump_view(_question_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE qa_questions SET view_count = view_count + 1 WHERE id = _question_id;
$$;

-- ============ Seed initial categories ============
INSERT INTO public.qa_categories (slug, name_en, name_bn, icon, color, sort_order) VALUES
  ('aqeedah', 'Aqeedah', 'আকীদা', 'BookOpen', '#6366f1', 10),
  ('fiqh', 'Fiqh', 'ফিকহ', 'Scale', '#10b981', 20),
  ('quran', 'Quran', 'কুরআন', 'BookText', '#f59e0b', 30),
  ('hadith', 'Hadith', 'হাদীস', 'ScrollText', '#ec4899', 40),
  ('seerah', 'Seerah', 'সীরাত', 'Heart', '#8b5cf6', 50),
  ('family', 'Family & Marriage', 'পরিবার ও বিবাহ', 'Users', '#06b6d4', 60),
  ('worship', 'Worship', 'ইবাদত', 'Sparkles', '#22c55e', 70),
  ('general', 'General', 'সাধারণ', 'HelpCircle', '#64748b', 100)
ON CONFLICT (slug) DO NOTHING;
