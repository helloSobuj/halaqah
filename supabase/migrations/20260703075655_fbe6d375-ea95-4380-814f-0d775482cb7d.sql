-- Fix: hide quiz answer keys from public API by removing column-level SELECT
-- on correct_indices, correct_text, correct_order. Server code reads via
-- service role (supabaseAdmin), which is unaffected.
REVOKE SELECT ON public.quiz_questions FROM anon, authenticated;
GRANT SELECT (
  id, quiz_id, type, text_en, text_bn, options_en, options_bn,
  points, order_index, image_url, hint_en, hint_bn,
  explanation_en, explanation_bn, created_at
) ON public.quiz_questions TO anon, authenticated;

-- Fix: remove overly broad "Users can register as host" UPDATE policy that let
-- any authenticated user rewrite every column on a published event row.
-- Host registration is handled server-side via the registerAsHost server
-- function using the service role, so no client-side UPDATE policy is needed.
DROP POLICY IF EXISTS "Users can register as host" ON public.events;