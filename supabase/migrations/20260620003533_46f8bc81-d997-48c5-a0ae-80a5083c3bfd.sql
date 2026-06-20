
CREATE TABLE public.event_speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  topic text NOT NULL,
  start_minute integer NOT NULL,
  duration_minutes integer NOT NULL,
  is_for_child boolean NOT NULL DEFAULT false,
  child_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_speakers_duration_chk CHECK (duration_minutes >= 5 AND duration_minutes <= 45 AND duration_minutes % 5 = 0),
  CONSTRAINT event_speakers_start_chk CHECK (start_minute >= 0 AND start_minute % 5 = 0)
);

CREATE INDEX event_speakers_event_idx ON public.event_speakers(event_id, start_minute);
CREATE INDEX event_speakers_user_idx ON public.event_speakers(user_id);

GRANT SELECT ON public.event_speakers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_speakers TO authenticated;
GRANT ALL ON public.event_speakers TO service_role;

ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read speakers of published events"
  ON public.event_speakers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_speakers.event_id AND e.is_published = true)
  );

CREATE POLICY "Authenticated can register themselves"
  ON public.event_speakers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own speaker entry"
  ON public.event_speakers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own speaker entry"
  ON public.event_speakers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can manage all speakers"
  ON public.event_speakers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER update_event_speakers_updated_at
  BEFORE UPDATE ON public.event_speakers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
