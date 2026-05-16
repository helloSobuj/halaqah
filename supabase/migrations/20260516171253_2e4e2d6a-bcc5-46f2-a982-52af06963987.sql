-- Daily Hadith cache (one row per date)
CREATE TABLE public.daily_hadith (
  date date PRIMARY KEY,
  arabic text NOT NULL,
  en text NOT NULL,
  bn text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_hadith ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily hadith is publicly readable"
ON public.daily_hadith
FOR SELECT
USING (true);
