CREATE TABLE public.daily_ayat (
  date date PRIMARY KEY,
  arabic text NOT NULL,
  bn text NOT NULL,
  en text NOT NULL,
  surah_number int NOT NULL,
  ayat_number int NOT NULL,
  surah_name_en text NOT NULL,
  surah_name_bn text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_ayat TO anon, authenticated;
GRANT ALL ON public.daily_ayat TO service_role;
ALTER TABLE public.daily_ayat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily ayat is publicly readable" ON public.daily_ayat FOR SELECT USING (true);