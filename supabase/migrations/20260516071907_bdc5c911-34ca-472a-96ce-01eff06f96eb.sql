CREATE OR REPLACE FUNCTION public._qa_award_badge(_user uuid, _code text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rows int := 0;
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;
  INSERT INTO qa_badges(user_id, code, meta) VALUES (_user, _code, _meta)
    ON CONFLICT (user_id, code) DO NOTHING;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END $$;