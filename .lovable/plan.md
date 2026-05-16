## Q&A Phase B — Plan

Phase A shipped the core Q&A (ask, answer, vote, accept, endorse, leaderboard, daily quests). This phase closes the loop on moderation, user identity, i18n, and the gamification surfaces that were scoped but not yet built.

### 1. Admin moderation panel — `/admin/qa`
- New route `src/routes/_authenticated/admin.qa.tsx` (admin/moderator only).
- Tabs: **Flags**, **Questions**, **Answers**, **Categories**, **Tags**.
- Flags tab: list `qa_flags` where `status='open'`, with target preview, reporter, reason; actions: dismiss / delete target / lock question.
- Questions/Answers tabs: search + filter (deleted, locked, needs-scholar-review), bulk soft-delete, lock/unlock, mark `scholar_review_required`.
- Categories tab: CRUD on `qa_categories` (name_en/bn, slug, color, icon, sort_order).
- Tags tab: rename/merge tags (admin only), edit label, see usage_count.
- Server fns added to `src/lib/qa.functions.ts`: `listFlags`, `resolveFlag`, `adminListQuestions`, `adminListAnswers`, `adminUpsertCategory`, `adminMergeTags`, `adminToggleLock`.
- Migration: add `is_locked boolean default false` to `qa_questions`; add `qa_flag` RLS already permits staff update.

### 2. Q&A activity tab in user profile
- Edit `src/routes/_authenticated/profile.tsx`: add a new tab **Q&A** alongside existing Quiz History.
- Sections:
  - Reputation header: `qa_reputation`, weekly delta from `qa_reputation_events`, answer streak.
  - Recent questions asked (title, vote, answer count, accepted indicator).
  - Recent answers (question title link, vote, accepted/endorsed badges).
  - Reputation ledger (last 20 events with reason chips).
- New server fn `getMyQAActivity` returning `{ stats, questions, answers, events }`.
- Public profile route `/u/$userId` gets the same Q&A panel (read-only, omits ledger).

### 3. Translations (en/bn)
- Add namespaces to existing i18n setup for Q&A:
  - `qa.feed.*`, `qa.ask.*`, `qa.question.*`, `qa.leaderboard.*`, `qa.profile.*`, `qa.admin.*`, `qa.quests.*`, `qa.rep.*`.
- Replace hard-coded strings in: `qa.index.tsx`, `qa.ask.tsx`, `qa.$questionId.tsx`, `qa.leaderboard.tsx`, `qa-shared.tsx`, new admin + profile pieces.
- Category & tag display already uses `name_en`/`name_bn`; wire to current `language` from i18n.
- This also fixes the current hydration error on `/qa` (SSR rendered English, client switched to Bengali) by reading the persisted language before first render in the i18n init.

### 4. Gamification polish (no new core mechanics)
- **Badges**: add `qa_badges` table + awarding triggers for: Curious (first question), Helpful (first accepted answer), Teacher (10 accepted), Scholar's Pick (first endorsement), Streak Sage (7-day answer streak), Top Contributor (top 3 monthly leaderboard).
- Show earned badges on profile + small badge row on question/answer author chip.
- **Privilege ladder hint**: tooltip on disabled vote-down / flag buttons explaining the rep threshold (15 to downvote already enforced).
- **Daily quest claim**: wire `claimDailyBonus` button on `/qa` when all three quests done → +10 rep, sets `bonus_claimed=true`.

### 5. Deferred (not in this phase)
- AI polish for question titles, AI translate answers, citation picker UI, bounty system, anonymous-question moderator reveal flow.

### Technical notes
- All new server fns use `requireSupabaseAuth`; admin fns additionally check `has_role(userId, 'admin'|'moderator')` server-side.
- All new tables get RLS: badges readable by all, insertable only via SECURITY DEFINER trigger.
- Realtime not added in this phase; lists refetch on mutation via TanStack Query invalidation.

### Files
- New: `src/routes/_authenticated/admin.qa.tsx`, `src/routes/u.$userId.tsx`, `src/components/qa/qa-profile-panel.tsx`, `src/components/qa/qa-badges.tsx`, `src/components/qa/daily-quest-card.tsx`.
- Edited: `src/lib/qa.functions.ts`, `src/routes/_authenticated/profile.tsx`, `src/routes/qa.index.tsx`, `src/routes/qa.$questionId.tsx`, `src/routes/qa.ask.tsx`, `src/routes/qa.leaderboard.tsx`, `src/components/qa/qa-shared.tsx`, i18n locale files.
- Migration: `is_locked` on questions, `qa_badges` table + award triggers.

Approve and I'll implement in this order: migration → admin panel → profile tab → translations → badges/quest claim.
