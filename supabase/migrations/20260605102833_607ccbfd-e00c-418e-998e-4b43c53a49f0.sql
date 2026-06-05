
-- Restrict event_rsvps SELECT to RSVP owner and staff
DROP POLICY IF EXISTS "event_rsvps read all" ON public.event_rsvps;
CREATE POLICY "event_rsvps owner or staff read" ON public.event_rsvps
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Restrict qa_votes SELECT to vote owner and staff (drop public-true policy)
DROP POLICY IF EXISTS "qa_votes read all" ON public.qa_votes;
-- "qa_votes self read" already allows auth.uid() = user_id
CREATE POLICY "qa_votes staff read" ON public.qa_votes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Restrict blog_tags INSERT to staff only
DROP POLICY IF EXISTS "blog_tags auth insert" ON public.blog_tags;
CREATE POLICY "blog_tags staff insert" ON public.blog_tags
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Restrict qa_tags INSERT to staff only
DROP POLICY IF EXISTS "qa_tags auth insert" ON public.qa_tags;
CREATE POLICY "qa_tags staff insert" ON public.qa_tags
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
