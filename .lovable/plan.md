# Quiz Module — Finish & Verify

The quiz core (DB, RPCs, server functions, user UI, quiz CRUD admin, question editor, AI assist) is already built. This plan closes the remaining gaps so you can create a quiz in the admin panel and play it end-to-end.

## What's missing

1. **Categories UI** — server functions (`upsertCategory`, `deleteCategory`) exist, but there's no admin page. Without categories, the "Create quiz" form has nothing to pick.
2. **Attempts viewer UI** — `adminListAttempts` exists, no page.
3. **Admin dashboard "soon" flag** still set on the Quiz card (`admin.index.tsx:17`).
4. **Seed starter categories** so you can create a quiz immediately (Quran, Hadith, Fiqh, Seerah).
5. **Smoke test pass** — verify: create category → create quiz → add question manually → add 3 via AI → publish → play as user → see result + leaderboard entry.
6. **Hydration mismatch** on the brand text (`Halaqah` vs `হালাকাহ`) — small i18n SSR fix in `Logo`.

## Plan

### 1. Seed categories (data insert)

Insert 5 starter rows in `quiz_categories` (Quran/Hadith/Fiqh/Seerah/Qurbani, EN+BN, slugs, sort order).

### 2. New admin page `/admin/quiz/categories`

- Route: `src/routes/_authenticated/admin.quiz.categories.tsx`
- List + create/edit dialog (slug, name_en, name_bn, icon, color, sort_order) wired to `upsertCategory` / `deleteCategory`.
- Add "Categories" button on `admin.quiz.index.tsx` header.

### 3. New admin page `/admin/quiz/attempts`

- Route: `src/routes/_authenticated/admin.quiz.attempts.tsx`
- Table: user, quiz title, score/total, points, time, timestamp; filter by quiz dropdown. Wired to `adminListAttempts`.
- Add "Attempts" button on the admin quiz list header.

### 4. Polish admin quiz list

- Remove `soon: true` on the Quiz card in `admin.index.tsx`.
- Add quick links to Leaderboard (`/quiz/leaderboard?quizId=…`) and Attempts viewer per quiz row.

### 5. Fix Logo SSR hydration mismatch

- The brand label switches based on `i18n.language` which differs between server (default) and client (persisted). Render the EN label until mounted, or use `suppressHydrationWarning` on that span.

### 6. Smoke test

Run through the full flow in the preview, fix any regression that surfaces (ex: missing translation keys, RLS edge cases, attempts_left edge values).

## Files

```text
NEW   src/routes/_authenticated/admin.quiz.categories.tsx
NEW   src/routes/_authenticated/admin.quiz.attempts.tsx
EDIT  src/routes/_authenticated/admin.quiz.index.tsx     (header buttons)
EDIT  src/routes/_authenticated/admin.index.tsx          (remove soon flag)
EDIT  src/components/app-shell.tsx (Logo)                 (hydration fix)
EDIT  src/locales/en.json, src/locales/bn.json           (new strings)
DATA  insert 4 quiz_categories rows
```

## Out of scope

Tournaments, daily-quiz cron, true/false & fill-in-blank question types — kept for later phases as in the original plan.

Reply **"go"** and I'll execute.