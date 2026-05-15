# Phase 3 — Quiz Module (Full-featured)

A complete quiz experience: users browse categories, take timed quizzes, earn points/badges, climb a leaderboard, and bookmark favorites. Admins/Scholars manage the question bank.

## What ships

### User-facing (`/quiz`)

- **Quiz home** — featured quiz of the day, category cards (Quran, Hadith, Fiqh, Seerah, etc.), "Continue" if an attempt is in progress, personal stats strip (best streak, total points, rank).
- **Category page** `/quiz/$category` — list of quizzes with difficulty badge, question count, average score, bookmark toggle.
- **Quiz player** `/quiz/play/$quizId` — one question at a time, per-question timer, progress bar, MCQ (single + multi-correct), instant feedback toggle (admin setting), keyboard shortcuts.
- **Result screen** — score, time taken, points awarded, correct/incorrect breakdown with explanations, share button, leaderboard position.
- **Leaderboard** `/quiz/leaderboard` —per quiz-based, global + per-category, weekly + all-time tabs.
- **My quizzes** (inside Profile › Activity) — past attempts with score history.
- **Saved tab on Profile** — bookmarked quizzes now populated.
- Profile badge: Each time the user rank 1st 2nd, or 3rd in a quiz, the user should get a badge (1st,2nd,3rd) as an award and that should show on the profile. 

### Quiz Rules:  


1. Admin can control "How many attempts an individual user can take (one or {Attempt Number}).
2. If the admin set the attept number to 1 than the user should now allowed to take attempt more than once. and the system should track user IP address MAC address and session to prevent to take multiple attempts
  &nbsp;

### Gamification

- Points: base per correct answer + speed bonus + perfect-score bonus.
- Streak: consecutive days with at least one completed quiz (updates `profiles.streak`).
- Level: derived from points (1 level per 500 pts, capped server-side).
- Badges (auto-awarded, server-side): `first_quiz`, `perfect_score`, `streak_7`, `streak_30`, `category_master_<cat>` (10 perfects in a category), `top_10_weekly`. Stored in `profiles.badges` JSONB.

### Admin (`/admin/quiz`)

- Categories CRUD (name_en, name_bn, slug, icon, color, sort_order).
- Quizzes CRUD (title, description, category, difficulty, time limit, pass mark, instant_feedback flag, published flag, both languages).
- The admin can set the quiz starting time and quiz end time.
- Questions CRUD inside a quiz (text, type=single|multi, options array, correct indices, explanation, points, order). Inline editor with reorder.
- there should be a AI Assistent to help the admin to make the questions and options, use open router API for the AI (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)
- Bulk import questions via JSON paste (validated with Zod).
- Attempts viewer (read-only, filter by user/quiz, see score & timestamps).
- Scholar role can edit questions/quizzes; Moderator can unpublish; Admin can delete and manage categories.
- admin can see quiz result and leaderboard for each quiz and each profile.

### i18n

All quiz content is bilingual: every category, quiz, question, option, and explanation has `_en` and `_bn` columns. UI strings added to `en.json`/`bn.json`.

## Database

One migration adds:

```text
quiz_categories     (id, slug, name_en, name_bn, icon, color, sort_order)
quizzes             (id, category_id, title_en, title_bn, description_en, description_bn,
                     difficulty, time_limit_seconds, pass_mark, instant_feedback,
                     published, created_by, created_at, updated_at)
quiz_questions      (id, quiz_id, type, text_en, text_bn, options_en jsonb, options_bn jsonb,
                     correct_indices int[], explanation_en, explanation_bn, points, order_index)
quiz_attempts       (id, user_id, quiz_id, score, total, time_taken_seconds, points_awarded,
                     answers jsonb, completed_at)
quiz_bookmarks      (id, user_id, quiz_id, created_at, UNIQUE(user_id, quiz_id))
```

RLS:

- Categories/quizzes/questions: public SELECT when `published=true`; staff SELECT all; INSERT/UPDATE/DELETE gated by `has_role(admin|scholar)` (delete admin-only).
- Attempts: user reads/writes own; admins read all.
- Bookmarks: user reads/writes own.

SQL helpers:

- `submit_quiz_attempt(quiz_id, answers jsonb, time_taken int)` — SECURITY DEFINER, computes score server-side, inserts attempt, updates `profiles.points/streak/level`, evaluates badges, returns result row. Prevents client-side score tampering.
- `get_leaderboard(category_id uuid default null, period text default 'all')` — returns top 50 with display_name, avatar_url, total points.

Indexes on `quiz_questions(quiz_id, order_index)`, `quiz_attempts(user_id, completed_at desc)`, `quiz_attempts(quiz_id, score desc)`.

## Server functions (`src/lib/quiz.functions.ts`)

User-scoped (`requireSupabaseAuth`):

- `listCategories()`, `listQuizzes({ categorySlug })`, `getQuizForPlay(quizId)` — strips `correct_indices` from payload.
- `submitAttempt({ quizId, answers, timeTaken })` — calls `submit_quiz_attempt` RPC.
- `toggleBookmark({ quizId })`, `listBookmarks()`, `listMyAttempts()`.
- `getLeaderboard({ categoryId?, period })`.

Staff-scoped (extra `has_role` check inside handler):

- `upsertCategory`, `deleteCategory`, `upsertQuiz`, `togglePublish`, `upsertQuestion`, `reorderQuestions`, `deleteQuestion`, `bulkImportQuestions`.

All inputs validated with Zod (length limits, enum checks, array bounds).

## Files

```text
NEW   supabase migration (tables + RLS + RPCs)
NEW   src/lib/quiz.functions.ts
NEW   src/lib/quiz.schemas.ts             (shared Zod schemas)
NEW   src/components/quiz/quiz-card.tsx
NEW   src/components/quiz/question-player.tsx
NEW   src/components/quiz/result-summary.tsx
NEW   src/components/quiz/leaderboard-table.tsx
EDIT  src/routes/quiz.tsx                 (replace coming-soon → home)
NEW   src/routes/quiz.$category.tsx
NEW   src/routes/quiz.play.$quizId.tsx
NEW   src/routes/quiz.leaderboard.tsx
NEW   src/routes/_authenticated/admin.quiz.tsx           (layout + list)
NEW   src/routes/_authenticated/admin.quiz.$quizId.tsx   (question editor)
EDIT  src/routes/_authenticated/admin.index.tsx         (link Quiz card)
EDIT  src/routes/_authenticated/profile.tsx             (wire Saved + Activity tabs)
EDIT  src/locales/en.json, src/locales/bn.json
```

## Out of scope (later phases)

- Tournaments / multiplayer head-to-head.

- Daily-quiz auto-rotation cron.
- True/false, fill-in-blank, image questions.
- Group Tournaments
- AI-generated questions.

## Confirm to proceed

Reply **"go"** and I'll run the migration, then build server functions, then user UI, then admin UI.