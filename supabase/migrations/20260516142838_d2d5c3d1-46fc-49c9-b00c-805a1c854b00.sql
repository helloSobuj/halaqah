
-- Shared updated_at helper (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Categories
CREATE TABLE public.blog_categories (
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
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_categories public read" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "blog_categories staff write" ON public.blog_categories FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Tags
CREATE TABLE public.blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_en text NOT NULL,
  label_bn text NOT NULL DEFAULT '',
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_tags public read" ON public.blog_tags FOR SELECT USING (true);
CREATE POLICY "blog_tags auth insert" ON public.blog_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "blog_tags staff manage" ON public.blog_tags FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Posts
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_bn text NOT NULL DEFAULT '',
  excerpt_en text,
  excerpt_bn text,
  content_md_en text NOT NULL DEFAULT '',
  content_md_bn text NOT NULL DEFAULT '',
  cover_image_url text,
  audio_url text,
  audio_duration_seconds integer,
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id uuid,
  language text NOT NULL DEFAULT 'en',
  reading_minutes integer NOT NULL DEFAULT 1,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(is_published, published_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category_id);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts public read published" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "blog_posts author read own" ON public.blog_posts FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "blog_posts staff read" ON public.blog_posts FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));
CREATE POLICY "blog_posts staff write" ON public.blog_posts FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Post <-> Tags
CREATE TABLE public.blog_post_tags (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_post_tags public read" ON public.blog_post_tags FOR SELECT USING (true);
CREATE POLICY "blog_post_tags staff write" ON public.blog_post_tags FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Comments
CREATE TABLE public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  body_md text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_comments_post ON public.blog_comments(post_id);
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_comments public read" ON public.blog_comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "blog_comments own insert" ON public.blog_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blog_comments own update" ON public.blog_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "blog_comments own delete" ON public.blog_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "blog_comments staff manage" ON public.blog_comments FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Likes
CREATE TABLE public.blog_likes (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_likes public read" ON public.blog_likes FOR SELECT USING (true);
CREATE POLICY "blog_likes own all" ON public.blog_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bookmarks
CREATE TABLE public.blog_bookmarks (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.blog_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_bookmarks own all" ON public.blog_bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER blog_categories_updated BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER blog_posts_updated BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER blog_comments_updated BEFORE UPDATE ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_blog_view(_post_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.blog_posts SET view_count = view_count + 1 WHERE id = _post_id;
$$;

CREATE OR REPLACE FUNCTION public.blog_likes_count_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.blog_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER blog_likes_count AFTER INSERT OR DELETE ON public.blog_likes
  FOR EACH ROW EXECUTE FUNCTION public.blog_likes_count_trigger();

CREATE OR REPLACE FUNCTION public.blog_comments_count_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.blog_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER blog_comments_count AFTER INSERT OR DELETE ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.blog_comments_count_trigger();

CREATE OR REPLACE FUNCTION public.blog_tag_usage_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.blog_tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER blog_tag_usage AFTER INSERT OR DELETE ON public.blog_post_tags
  FOR EACH ROW EXECUTE FUNCTION public.blog_tag_usage_trigger();

INSERT INTO storage.buckets (id, name, public) VALUES ('blog-media', 'blog-media', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-audio', 'blog-audio', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "blog-media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-media');
CREATE POLICY "blog-media auth upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "blog-media owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "blog-media owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "blog-audio public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-audio');
CREATE POLICY "blog-audio staff write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-audio' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')));
CREATE POLICY "blog-audio staff update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-audio' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')));
CREATE POLICY "blog-audio staff delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-audio' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')));
