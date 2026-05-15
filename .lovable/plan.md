# Chunk 2 — Authoring Depth

Add richer question types, question images, and CSV import/export to the Quiz Module.

## Scope

1. **New question types** beyond `single` / `multiple`:
   - `true_false` — two fixed options, single correct
   - `fill_blank` — free-text answer, case-insensitive match against accepted answers
   - `ordering` — user drags options into the correct sequence

2. **Question media** — optional image per question (uploaded to a new `quiz-media` storage bucket).

3. **CSV import/export** for questions in the admin editor.

## Database changes (one migration)

Extend `quiz_questions`:
- `correct_text text[]` — accepted answers for `fill_blank` (lowercased on compare)
- `correct_order int[]` — canonical order for `ordering`
- `image_url text` — optional question image
- `hint_en text`, `hint_bn text` — optional per-question hint (currently only explanation exists)

Storage:
- New public bucket `quiz-media` with RLS: read = public; insert/update/delete = staff (admin/scholar).

Update `submit_quiz_attempt` SQL function to grade by `type`:
- `single` / `multiple` — existing `correct_indices` compare
- `true_false` — same as `single` with 2 options
- `fill_blank` — normalize (trim+lowercase) submitted string, check membership in `correct_text`
- `ordering` — compare submitted index array equality with `correct_order`

Answer payload shape per question id:
- single/multiple/true_false: `number[]`
- fill_blank: `string`
- ordering: `number[]` (current order of option indices)

## Server functions (`src/lib/quiz.functions.ts` + `quiz.schemas.ts`)

- Extend question Zod schema with new fields and a discriminated union by `type`.
- `upsertQuestion` accepts new fields.
- `uploadQuestionImage` server fn → uses `supabaseAdmin` (after `requireSupabaseAuth` + role check) to upload to `quiz-media` and return public URL. Or do client-side upload with the user-scoped client and bucket RLS.
- `importQuestionsCsv({ quizId, rows })` — bulk insert validated rows.
- `exportQuestionsCsv({ quizId })` — return CSV string.

CSV columns: `type,text_en,text_bn,options_en,options_bn,correct,explanation_en,explanation_bn,hint_en,hint_bn,points,image_url`
- `options_*` = `|`-separated
- `correct` = `|`-separated indices for single/multiple/true_false/ordering, or `|`-separated accepted answers for fill_blank

## Admin editor (`src/routes/_authenticated/admin.quiz.$quizId.tsx` + new components)

- New `QuestionEditor` component with a `type` select that swaps the editor body:
  - `single` / `multiple` — existing options + correct checkboxes
  - `true_false` — fixed True/False rows, radio for correct
  - `fill_blank` — list of accepted answers (add/remove rows), no options
  - `ordering` — option rows with drag handles; "correct order" = current row order
- Image upload row (preview + remove) on every question.
- Hint fields (en/bn).
- Toolbar buttons: **Import CSV**, **Export CSV**, **Download template**.

## Player (`src/components/quiz/question-player.tsx`)

Render a sub-component per `type`:
- `TrueFalseInput` — two big buttons
- `FillBlankInput` — single text input
- `OrderingInput` — list with up/down buttons (keep DnD optional; arrows guarantee mobile + a11y)
- Existing single/multiple unchanged

Local answer state must serialize to the shape the grader expects.

## Review screen

Update `quiz.review.$attemptId.tsx` to render correct answers per type (text list for fill_blank, ordered list for ordering, T/F label for true_false).

## i18n

Add keys for: question type labels, "Add answer", "Accepted answers", "Correct order", "Drag to reorder", "Upload image", "Import CSV", "Export CSV", "Download template", "Hint", in `en.json` + `bn.json`.

## Out of scope (deferred to Chunk 3)

Daily quiz, tournaments, reminders, notifications.

## Files

**New**
- `src/components/quiz/question-editor.tsx`
- `src/components/quiz/inputs/true-false-input.tsx`
- `src/components/quiz/inputs/fill-blank-input.tsx`
- `src/components/quiz/inputs/ordering-input.tsx`
- `src/lib/quiz.csv.ts`
- `supabase/migrations/<ts>_quiz_question_types.sql`

**Edited**
- `src/lib/quiz.functions.ts`, `src/lib/quiz.schemas.ts`
- `src/components/quiz/question-player.tsx`
- `src/routes/_authenticated/admin.quiz.$quizId.tsx`
- `src/routes/quiz.review.$attemptId.tsx`
- `src/integrations/supabase/types.ts` (auto)
- `src/locales/en.json`, `src/locales/bn.json`

## Open questions

1. **Ordering UX**: arrows only (simpler, mobile-friendly, a11y-safe) or full drag-and-drop with `@dnd-kit`? I'll default to **arrows** unless you say otherwise.
2. **Fill-blank matching**: case-insensitive + trim only, or also strip diacritics / allow regex? Default: **case-insensitive + trim**.
3. **CSV**: ship with a downloadable template button? Default: **yes**.

Reply "go" to proceed with the defaults, or override any of the three.