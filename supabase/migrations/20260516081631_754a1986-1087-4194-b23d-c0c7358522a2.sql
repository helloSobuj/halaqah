
-- Categories
CREATE TABLE public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_bn text NOT NULL,
  color text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_categories read all" ON public.event_categories FOR SELECT USING (true);
CREATE POLICY "event_categories admin manage" ON public.event_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE TRIGGER event_categories_set_updated_at BEFORE UPDATE ON public.event_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL,
  title_en text NOT NULL,
  title_bn text NOT NULL,
  description_md_en text NOT NULL DEFAULT '',
  description_md_bn text NOT NULL DEFAULT '',
  cover_image_url text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'UTC',
  mode text NOT NULL DEFAULT 'offline' CHECK (mode IN ('online','offline','hybrid')),
  venue text,
  address text,
  online_url text,
  capacity int,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_by uuid,
  view_count int NOT NULL DEFAULT 0,
  share_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_starts_at_idx ON public.events (starts_at DESC);
CREATE INDEX events_published_idx ON public.events (is_published, starts_at);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events read published" ON public.events FOR SELECT
  USING (is_published = true OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "events staff insert" ON public.events FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "events staff update" ON public.events FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "events admin delete" ON public.events FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RSVPs
CREATE TABLE public.event_rsvps (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'going' CHECK (status IN ('going','interested','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_rsvps read all" ON public.event_rsvps FOR SELECT USING (true);
CREATE POLICY "event_rsvps self manage" ON public.event_rsvps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER event_rsvps_set_updated_at BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Shares (analytics)
CREATE TABLE public.event_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('link','image','whatsapp','facebook','x','telegram','native','qr_scan')),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_shares_event_idx ON public.event_shares(event_id);
ALTER TABLE public.event_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_shares anyone insert" ON public.event_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "event_shares staff read" ON public.event_shares FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- View bump
CREATE OR REPLACE FUNCTION public.bump_event_view(_event_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.events SET view_count = view_count + 1 WHERE id = _event_id;
$$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images','event-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "event-images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');
CREATE POLICY "event-images authed upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "event-images owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "event-images owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed a few categories
INSERT INTO public.event_categories (slug, name_en, name_bn, color, icon, sort_order) VALUES
  ('lecture','Lecture','লেকচার','#3b82f6','BookOpen',1),
  ('workshop','Workshop','কর্মশালা','#10b981','Wrench',2),
  ('community','Community','কমিউনিটি','#f59e0b','Users',3),
  ('online','Online','অনলাইন','#8b5cf6','Globe',4)
ON CONFLICT (slug) DO NOTHING;
