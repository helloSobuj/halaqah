
-- Categories
CREATE TABLE public.library_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_bn text NOT NULL,
  color text DEFAULT '#6366f1',
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.library_categories FOR SELECT USING (true);
CREATE POLICY "categories staff write" ON public.library_categories FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE TRIGGER set_library_categories_updated_at BEFORE UPDATE ON public.library_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Books
CREATE TABLE public.library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  author text,
  description text,
  language text NOT NULL DEFAULT 'en',
  category_id uuid REFERENCES public.library_categories(id) ON DELETE SET NULL,
  cover_image_url text,
  published_year int,
  pages int,
  source_type text NOT NULL CHECK (source_type IN ('pdf','external')),
  pdf_path text,
  pdf_size_bytes bigint,
  external_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  download_count int NOT NULL DEFAULT 0,
  view_count int NOT NULL DEFAULT 0,
  share_count int NOT NULL DEFAULT 0,
  avg_rating numeric(3,2) NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX library_books_status_idx ON public.library_books(status);
CREATE INDEX library_books_category_idx ON public.library_books(category_id);
CREATE INDEX library_books_language_idx ON public.library_books(language);
CREATE INDEX library_books_submitted_by_idx ON public.library_books(submitted_by);

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "books public read approved" ON public.library_books FOR SELECT
  USING (status = 'approved');
CREATE POLICY "books own read" ON public.library_books FOR SELECT
  USING (auth.uid() = submitted_by);
CREATE POLICY "books staff read" ON public.library_books FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "books user submit" ON public.library_books FOR INSERT
  WITH CHECK (auth.uid() = submitted_by AND status = 'pending');
CREATE POLICY "books staff write" ON public.library_books FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

CREATE TRIGGER set_library_books_updated_at BEFORE UPDATE ON public.library_books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bookmarks
CREATE TABLE public.library_bookmarks (
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (book_id, user_id)
);
ALTER TABLE public.library_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks own all" ON public.library_bookmarks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ratings
CREATE TABLE public.library_ratings (
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (book_id, user_id)
);
ALTER TABLE public.library_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings public read" ON public.library_ratings FOR SELECT USING (true);
CREATE POLICY "ratings own write" ON public.library_ratings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public._library_recompute_rating(_book_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _avg numeric; _cnt int;
BEGIN
  SELECT COALESCE(AVG(value)::numeric(3,2),0), COUNT(*) INTO _avg, _cnt
    FROM library_ratings WHERE book_id = _book_id;
  UPDATE library_books SET avg_rating = _avg, rating_count = _cnt WHERE id = _book_id;
END $$;

CREATE OR REPLACE FUNCTION public._library_rating_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM _library_recompute_rating(OLD.book_id);
    RETURN OLD;
  ELSE
    PERFORM _library_recompute_rating(NEW.book_id);
    RETURN NEW;
  END IF;
END $$;

CREATE TRIGGER library_ratings_aiud AFTER INSERT OR UPDATE OR DELETE ON public.library_ratings
  FOR EACH ROW EXECUTE FUNCTION public._library_rating_trigger();

-- Comments
CREATE TABLE public.library_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.library_comments(id) ON DELETE CASCADE,
  body_md text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX library_comments_book_idx ON public.library_comments(book_id);
ALTER TABLE public.library_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments public read" ON public.library_comments FOR SELECT
  USING (is_deleted = false);
CREATE POLICY "comments own insert" ON public.library_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments own update" ON public.library_comments FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments own delete" ON public.library_comments FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "comments staff write" ON public.library_comments FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE TRIGGER set_library_comments_updated_at BEFORE UPDATE ON public.library_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Downloads
CREATE TABLE public.library_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX library_downloads_book_idx ON public.library_downloads(book_id);
ALTER TABLE public.library_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "downloads insert any" ON public.library_downloads FOR INSERT
  WITH CHECK (true);
CREATE POLICY "downloads staff read" ON public.library_downloads FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- Bump download count helper
CREATE OR REPLACE FUNCTION public.bump_library_download(_book_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.library_books SET download_count = download_count + 1 WHERE id = _book_id;
$$;

CREATE OR REPLACE FUNCTION public.bump_library_view(_book_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.library_books SET view_count = view_count + 1 WHERE id = _book_id;
$$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('library-books','library-books', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "library-books public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'library-books');
CREATE POLICY "library-books auth upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'library-books' AND auth.uid() IS NOT NULL);
CREATE POLICY "library-books own update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'library-books' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "library-books own delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'library-books' AND (auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')));

-- Seed a few categories
INSERT INTO public.library_categories (slug, name_en, name_bn, icon, sort_order) VALUES
  ('quran','Quran & Tafsir','কুরআন ও তাফসীর','book-open',1),
  ('hadith','Hadith','হাদীস','scroll',2),
  ('aqeedah','Aqeedah','আকীদাহ','shield',3),
  ('fiqh','Fiqh','ফিকহ','scale',4),
  ('seerah','Seerah & History','সীরাহ ও ইতিহাস','landmark',5),
  ('tazkiyah','Tazkiyah & Self-Development','তাযকিয়াহ ও আত্মউন্নয়ন','heart',6),
  ('children','Children','শিশুদের জন্য','baby',7),
  ('other','Other','অন্যান্য','book',99)
ON CONFLICT (slug) DO NOTHING;
