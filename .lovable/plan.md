# Quiz Module — Phase 2 (finish the full module)

Phase 1 (build + play loop, admin CRUD, AI assist, leaderboard, timezone scheduling, mobile shell) is done. This phase closes everything originally listed as "out of scope" plus the user-facing surfaces still missing so the module is feature-complete.

## What's still missing

1. **More question types** — only `single` / `multi` MCQ exist. No `true_false`, `fill_blank`, `ordering`.
2. **Per-attempt review screen** — after submit users see score but can't review each question with their answer vs correct answer + explanation.
3. **My attempts / history page** — `listMyAttempts` server fn exists, no UI.
4. **Bookmarks page** — `listBookmarks` exists, no route.
5. **Profile quiz stats** — points, level, streak, badges are stored but never shown.
6. **Tournaments** — scheduled multi-round events with combined leaderboard.
7. **Result sharing** — share card (image/text) for social.
8. **Notifications** — "Quiz starts in 1 hour" reminders for scheduled quizzes (in-app + optional email).
9. **Question media** — optional image per question, image uploads via Storage.
10. **Anti-cheat polish** — tab-blur warning, paste blocker, randomized option order per attempt.
11. **CSV import/export** for questions (admin power-user).
12. add a count down timer on each question and add a circle style count down timer.

## Plan

### A. Question types (DB + editor + player)

- Migration: extend `quiz_questions.type` check to include `true_false`, `fill_blank`, `ordering`; add `correct_text` (text[]) for fill-blank, reuse `correct_indices` for ordering.
- `submit_quiz_attempt` RPC: branch grading by type (case-insensitive trim for fill-blank, exact sequence for ordering, boolean for T/F).
- Editor (`admin.quiz.$quizId.tsx`): conditional UI per type.
- Player (`question-player.tsx`): renderers per type.

### B. Review screen

- New route `/quiz/review/$attemptId`.
- Server fn `getAttemptReview(attemptId)` returns user answers + correct answers + explanations (own attempts only or staff).
- Link from result summary + my-attempts list.

### C. User pages

- `/quiz/my-attempts` — table from `listMyAttempts`, link to review.
- `/quiz/bookmarks` — grid of bookmarked quizzes.
- Profile route: add "Quiz stats" panel (points, level, streak, badge wall).

### E. Tournaments

- Migration: `quiz_tournaments(id, title_en/bn, starts_at, ends_at, timezone)`, `quiz_tournament_quizzes(tournament_id, quiz_id, order)`.
- Admin CRUD page `/admin/quiz/tournaments`.
- User page `/quiz/tournaments` + detail page with round list and combined leaderboard (sum of points across quizzes).

### F. Sharing

- `result-summary.tsx`: "Share result" button → copy text + open Web Share API.
- Optional: server-side OG image route `/api/public/quiz/og/$attemptId.png` using `@vercel/og`-compatible edge renderer.

### G. Notifications

- Migration: `quiz_reminders(user_id, quiz_id, remind_at, sent_at)`.
- "Remind me" button on `QuizCard` for scheduled quizzes (writes a row 1h before `starts_at`).
- Cron route `/api/public/cron/send-reminders` every 5 min — writes in-app notification rows (table `notifications` if exists, else create) and optionally calls Lovable Email.

### H. Question media

- Migration: `quiz_questions.image_url text`.
- Storage bucket `quiz-media` (admin-write, public-read).
- Editor: image upload + preview.
- Player: render image above question text.

### I. Anti-cheat polish

- Player: detect `visibilitychange` → toast warning + count blurs (store in attempt `meta jsonb`).
- Disable paste on fill-blank inputs.
- Per-attempt option shuffle (deterministic per attempt id, decoded back on submit).

### J. CSV import/export

- Editor: "Export CSV" downloads current questions; "Import CSV" parses and calls `bulkImportQuestions`.

## Suggested order

I recommend shipping in 3 PR-sized chunks so each one is testable end-to-end:

1. **Chunk 1 — User-facing depth** (B, C, F, I)  Review screen, my-attempts, bookmarks, profile stats, share, anti-cheat. Highest user value, no new infra.
2. **Chunk 2 — Authoring depth** (A, H, J) New question types, image uploads, CSV. Unlocks richer quizzes.
3. **Chunk 3 — Engagement engine** (D, E, G) Daily quiz, tournaments, reminders. Needs cron + notifications wiring.

## Files (per chunk, high level)

```text
Chunk 1
  NEW   src/routes/quiz.review.$attemptId.tsx
  NEW   src/routes/quiz.my-attempts.tsx
  NEW   src/routes/quiz.bookmarks.tsx
  EDIT  src/routes/_authenticated/profile.tsx        (quiz stats panel)
  EDIT  src/components/quiz/question-player.tsx      (blur tracking, paste block)
  EDIT  src/components/quiz/result-summary.tsx       (share + review link)
  EDIT  src/lib/quiz.functions.ts                    (getAttemptReview)

Chunk 2
  MIG   extend quiz_questions (type enum, correct_text, image_url) + grading RPC
  NEW   storage bucket quiz-media + policies
  EDIT  admin.quiz.$quizId.tsx                       (per-type UI, image upload, CSV)
  EDIT  src/lib/quiz.schemas.ts                      (new fields)

Chunk 3
  MIG   daily_quizzes, quiz_tournaments(_quizzes), quiz_reminders, notifications
  NEW   src/routes/api/public/cron/daily-quiz.ts
  NEW   src/routes/api/public/cron/send-reminders.ts
  NEW   src/routes/_authenticated/admin.quiz.tournaments.tsx
  NEW   src/routes/quiz.tournaments.tsx + tournaments.$id.tsx
  EDIT  QuizCard (remind me), quiz home (today's quiz card)
```

## Decisions I need from you

1. **Start with Chunk 1?** (recommended — biggest UX gain, low risk)
2. **Notifications channel:** in-app only, or also email via Lovable Email?
3. **Tournaments scope:** full bracket-style, or simple "set of quizzes with combined leaderboard"? (I'd default to the simple version.)

Reply **"go chunk 1"** (or specify a different chunk / answers) and I'll execute.