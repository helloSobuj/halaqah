
CREATE TABLE public.video_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_bn text NOT NULL,
  color text DEFAULT '#6366f1',
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "video_categories public read" ON public.video_categories FOR SELECT USING (true);
CREATE POLICY "video_categories staff write" ON public.video_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TABLE public.video_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category_id uuid REFERENCES public.video_categories(id) ON DELETE SET NULL,
  title_en text NOT NULL,
  title_bn text NOT NULL DEFAULT '',
  description_en text,
  description_bn text,
  cover_image_url text,
  youtube_playlist_id text,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_video_playlists_category ON public.video_playlists(category_id);
ALTER TABLE public.video_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "video_playlists public read" ON public.video_playlists FOR SELECT
  USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "video_playlists staff write" ON public.video_playlists FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  playlist_id uuid REFERENCES public.video_playlists(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.video_categories(id) ON DELETE SET NULL,
  title_en text NOT NULL,
  title_bn text NOT NULL DEFAULT '',
  description_en text,
  description_bn text,
  youtube_url text NOT NULL,
  youtube_video_id text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  speaker text,
  language text NOT NULL DEFAULT 'en',
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_videos_playlist ON public.videos(playlist_id);
CREATE INDEX idx_videos_category ON public.videos(category_id);
CREATE INDEX idx_videos_youtube ON public.videos(youtube_video_id);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos public read" ON public.videos FOR SELECT
  USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "videos staff write" ON public.videos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE OR REPLACE FUNCTION public.bump_video_view(_video_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.videos SET view_count = view_count + 1 WHERE id = _video_id;
$$;

CREATE TRIGGER update_video_categories_updated_at BEFORE UPDATE ON public.video_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_video_playlists_updated_at BEFORE UPDATE ON public.video_playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
