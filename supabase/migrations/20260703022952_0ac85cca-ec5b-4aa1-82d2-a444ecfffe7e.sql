
-- 1) event_stage_state
CREATE TABLE IF NOT EXISTS public.event_stage_state (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  current_speaker_id uuid REFERENCES public.event_speakers(id) ON DELETE SET NULL,
  timer_started_at timestamptz,
  timer_paused_at timestamptz,
  timer_remaining_seconds integer NOT NULL DEFAULT 0,
  announcement_text text,
  announcement_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_stage_state TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_stage_state TO authenticated;
GRANT ALL ON public.event_stage_state TO service_role;

ALTER TABLE public.event_stage_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stage_state_public_read" ON public.event_stage_state
  FOR SELECT USING (true);

CREATE POLICY "stage_state_staff_insert" ON public.event_stage_state
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "stage_state_staff_update" ON public.event_stage_state
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "stage_state_staff_delete" ON public.event_stage_state
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER trg_event_stage_state_updated_at
  BEFORE UPDATE ON public.event_stage_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) qa_questions additions
ALTER TABLE public.qa_questions
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS answered_on_stage_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_qa_questions_event_id ON public.qa_questions(event_id) WHERE event_id IS NOT NULL;

-- 3) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_stage_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_questions;
