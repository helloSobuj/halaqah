-- Add missing FKs so PostgREST embedded selects work.
-- Use NOT VALID + VALIDATE pattern? Simpler: just add (data is consistent).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quizzes_category_id_fkey') THEN
    ALTER TABLE public.quizzes
      ADD CONSTRAINT quizzes_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.quiz_categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_quiz_id_fkey') THEN
    ALTER TABLE public.quiz_questions
      ADD CONSTRAINT quiz_questions_quiz_id_fkey
      FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_attempts_quiz_id_fkey') THEN
    ALTER TABLE public.quiz_attempts
      ADD CONSTRAINT quiz_attempts_quiz_id_fkey
      FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_attempts_user_id_profiles_fkey') THEN
    ALTER TABLE public.quiz_attempts
      ADD CONSTRAINT quiz_attempts_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_bookmarks_quiz_id_fkey') THEN
    ALTER TABLE public.quiz_bookmarks
      ADD CONSTRAINT quiz_bookmarks_quiz_id_fkey
      FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_bookmarks_user_id_profiles_fkey') THEN
    ALTER TABLE public.quiz_bookmarks
      ADD CONSTRAINT quiz_bookmarks_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_bookmarks_user_quiz_unique') THEN
    ALTER TABLE public.quiz_bookmarks
      ADD CONSTRAINT quiz_bookmarks_user_quiz_unique UNIQUE (user_id, quiz_id);
  END IF;
END $$;