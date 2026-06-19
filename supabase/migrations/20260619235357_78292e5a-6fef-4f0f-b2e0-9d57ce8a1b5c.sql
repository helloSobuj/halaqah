
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS host_name text,
  ADD COLUMN IF NOT EXISTS host_address text,
  ADD COLUMN IF NOT EXISTS host_capacity integer,
  ADD COLUMN IF NOT EXISTS host_registered_at timestamptz,
  ADD COLUMN IF NOT EXISTS allow_host_registration boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_events_host_user ON public.events(host_user_id);

-- Allow authenticated users to claim host slot on an event when none is set.
DROP POLICY IF EXISTS "Users can register as host" ON public.events;
CREATE POLICY "Users can register as host"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    is_published = true
    AND allow_host_registration = true
    AND host_user_id IS NULL
  )
  WITH CHECK (
    host_user_id = auth.uid()
  );
