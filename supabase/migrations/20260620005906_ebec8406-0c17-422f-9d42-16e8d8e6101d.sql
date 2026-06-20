
CREATE TABLE public.event_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contributor_name text NOT NULL,
  contribution text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_contributors_event_idx ON public.event_contributors(event_id);
CREATE INDEX event_contributors_user_idx ON public.event_contributors(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_contributors TO authenticated;
GRANT ALL ON public.event_contributors TO service_role;

ALTER TABLE public.event_contributors ENABLE ROW LEVEL SECURITY;

-- Owners can read their own; host of the event can read; staff can read
CREATE POLICY "contrib_select_owner_host_staff"
  ON public.event_contributors FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_contributors.event_id AND e.host_user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "contrib_insert_self"
  ON public.event_contributors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contrib_update_owner_or_staff"
  ON public.event_contributors FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "contrib_delete_owner_or_staff"
  ON public.event_contributors FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE TRIGGER set_event_contributors_updated_at
  BEFORE UPDATE ON public.event_contributors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
