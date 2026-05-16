# Q&A Section — Full Build Plan

A community Q&A module for the Halaqah app where users can ask Islamic questions, get answers from peers and verified scholars, vote on the best answers, and earn reputation. Bilingual (EN/BN), gamified, moderated.

## 1. Core feature set

### Asking & answering

- **Ask a question**: title, rich body (markdown), language tag (en/bn/both), category, up to 5 free-text tags.
- **Answer a question**: markdown body. One user can post multiple answers? → No, **one answer per user per question** (editable). Keeps threads clean.
- **Comments** under questions and answers (short, plain text) for clarifications.
- **Edit/delete** your own posts (soft-delete; show "removed by author").
- **Accept an answer**: question owner picks one accepted answer (gold check). Can change later.

### Discovery

- Feed with tabs: **Newest · Unanswered · Trending · Top this week**.
- Filter by category, tag, language. Search bar (title + body, Postgres `tsvector`).
- Question detail page: question → accepted answer pinned → other answers sorted by score.

### Voting & quality signals

- Upvote / downvote on questions and answers (one vote per user per post, switchable).
- Vote score visible; downvote requires ≥15 reputation (prevents drive-by).
- Mark as duplicate / off-topic / needs detail (mods only initially).

### Roles in Q&A context

- **user** — ask, answer, upvote, comment.
- **scholar** — answers carry "Verified Scholar" badge; can mark answers as "Scholar-endorsed".
- **moderator** — close, reopen, edit any post, remove.
- **admin** — everything + category management.

### Notifications (reuses existing bell + push infra)

- Your question got an answer.
- Your answer was accepted / endorsed by scholar.
- Someone commented on your post.
- Someone @mentioned you.
- Weekly digest (opt-in).

## 2. Gamification — recommended set

Pick which to ship; my picks marked ✅.

### Reputation (core score) ✅

Visible number on profile; drives privileges.

- +10 question upvoted
- +15 answer upvoted
- +25 answer accepted (answerer) / +5 (asker, for picking)
- +50 scholar-endorsed answer
- −2 you downvote an answer (small cost so it's not free)
- −5 your post downvoted
- Daily cap: +200 from voting (anti-farming)

### Privilege ladder (unlocked by reputation) ✅

Mirrors StackOverflow but tuned smaller:


| Rep  | Unlocks                        |
| ---- | ------------------------------ |
| 1    | Ask, answer, comment           |
| 15   | Downvote, flag                 |
| 50   | Edit community wiki posts      |
| 200  | Vote to close own questions    |
| 500  | Suggest edits to others' posts |
| 2000 | Edit any post without review   |


### Badges ✅

Reuses existing `profiles.badges` JSONB array.

- **Curious** — first question asked
- **Helpful** — first accepted answer
- **Teacher** — answer with score ≥10
- **Scholar's Pick** — answer endorsed by scholar
- **Streak Sage** — answered ≥1 question for 7 days straight
- **Polyglot** — posted in both EN and BN
- **Top Contributor** — top 10 on weekly leaderboard
- **Ramadan Helper** — seasonal, answered ≥30 questions in Ramadan

### Levels ✅

Already exists on `profiles.level` — extend formula to include Q&A reputation.

### Q&A leaderboard ✅

Weekly / monthly / all-time tabs. Show: avatar, name, rep gained, answers count, accepted count.

### Daily quests (optional, lightweight) ✅

"Today's goals" card shown on Q&A home:

- Answer 1 question (+5 bonus rep)
- Upvote 3 helpful answers (+2 rep)
- Ask a thoughtful question with ≥1 tag (+5 rep)
Resets at midnight user-tz.

### Bounty system (optional, deferred)

Spend rep to put a bounty on an unanswered question (e.g. 50 rep → answerer gets 50 extra). Nice but cut from MVP.

### Streaks

Answer at least one question per day → "Answer streak". Pairs with quiz streak.

### Suggestions to make UX better

1. **AI-assisted question polish** (uses existing openrouter api): when drafting, a "Refine my question" button rewrites for clarity, adds suggested tags. Optional.
2. **Similar questions while typing** — as user types title, search existing questions and show "Was your question already asked?" — reduces duplicates.
3. **Scholar queue** — questions tagged `needs-scholar` go into a dedicated inbox for verified scholars; they get a small reputation boost for clearing it.
4. **Sensitive topic guardrail** — questions about fiqh/aqeedah edge cases auto-tagged "scholar-review" and hidden from public feed until reviewed.
5. **Anonymous asking** — option to post a question anonymously (still tracked server-side for moderation, hidden in UI). Encourages sensitive questions.
6. **Bookmark + follow question** — get notified when a new answer arrives even if not the asker.
7. **Reading time + complexity tag** auto-computed on answers.
8. **"Translate this answer"** button (Lovable AI) — EN ↔ BN on demand, cached.
9. **Citations field** on answers — Quran/Hadith reference picker (book, chapter, verse) rendered as a clean badge linking to source. Adds trust and fits the app's domain.
10. **Spam/harm flagging** with auto-hide at 3 flags, mod review queue.

## 3. Database schema

```sql
-- categories
qa_categories (
  id uuid pk, slug text unique, name_en text, name_bn text,
  icon text, color text, sort_order int, created_at, updated_at
)

-- questions
qa_questions (
  id uuid pk, user_id uuid (auth.users), category_id uuid (qa_categories),
  title text, body_md text, language text default 'en',  -- en | bn | both
  is_anonymous boolean default false,
  status text default 'open',   -- open | closed | duplicate | needs_scholar
  duplicate_of uuid null,
  view_count int default 0,
  answer_count int default 0,
  vote_score int default 0,
  accepted_answer_id uuid null,
  scholar_review_required boolean default false,
  search_tsv tsvector,          -- generated col over title+body
  created_at, updated_at,
  last_activity_at timestamptz default now()
)

-- tags (free-text, normalized)
qa_tags (id uuid pk, slug text unique, label text, usage_count int)
qa_question_tags (question_id, tag_id, primary key)

-- answers (one per user per question)
qa_answers (
  id uuid pk, question_id uuid, user_id uuid,
  body_md text, vote_score int default 0,
  is_accepted boolean default false,
  is_scholar_endorsed boolean default false,
  endorsed_by uuid null, endorsed_at timestamptz null,
  citations jsonb default '[]', -- [{type:'quran', surah:2, ayah:255, text_en, text_bn}]
  created_at, updated_at,
  unique (question_id, user_id)
)

-- comments (flat, on either question or answer)
qa_comments (
  id uuid pk, parent_type text check (parent_type in ('question','answer')),
  parent_id uuid, user_id uuid, body text, created_at
)

-- votes
qa_votes (
  id uuid pk, user_id uuid, target_type text, target_id uuid,
  value smallint check (value in (-1, 1)),
  created_at,
  unique (user_id, target_type, target_id)
)

-- bookmarks / follows
qa_follows (user_id, question_id, created_at, primary key)

-- flags
qa_flags (
  id uuid pk, user_id uuid, target_type, target_id,
  reason text, status text default 'open', created_at
)

-- reputation ledger (audit + daily cap enforcement)
qa_reputation_events (
  id uuid pk, user_id uuid, delta int, reason text,
  source_type text, source_id uuid, created_at
)

-- daily quest state
qa_daily_quests (
  user_id, date date,
  answered int default 0, upvoted int default 0, asked int default 0,
  bonus_claimed boolean default false,
  primary key (user_id, date)
)
```

Add column to `profiles`:

- `qa_reputation int default 0` (cached sum of ledger; trigger keeps in sync)
- `qa_answer_streak int default 0`
- `qa_last_answered_on date`

### RLS summary (plain English)

- Anyone can read questions, answers, comments, tags, categories.
- Authenticated users insert questions/answers/comments tied to their `user_id`.
- Users update/soft-delete their own posts.
- Voting: insert/update/delete own vote row only; downvote check (≥15 rep) enforced in SQL function `cast_vote()`.
- Accept answer: only question owner via `accept_answer()` SQL function.
- Scholar-endorse: only users with `scholar`/`admin` role via `endorse_answer()`.
- Mods/admins can update/remove any post.
- Reputation ledger insert-only, server-side via SECURITY DEFINER functions.

### Server-side functions (SQL)

- `cast_vote(target_type, target_id, value)` — upserts vote, recomputes score, writes rep ledger, enforces caps.
- `accept_answer(answer_id)` — sets accepted, writes rep events.
- `endorse_answer(answer_id)` — scholar only.
- `submit_question(...)`, `submit_answer(...)` — validate, write, trigger notifications.
- `get_qa_leaderboard(period)` — aggregates from rep ledger.
- Trigger `qa_questions_search_tsv` keeps `search_tsv` in sync.

## 4. Server functions (TanStack `createServerFn`)

`src/lib/qa.functions.ts` — all under `requireSupabaseAuth` except public reads which use `supabaseAdmin` with explicit projections:

- `listQuestions({ tab, category, tag, lang, q, cursor })`
- `getQuestion(id)` (also bumps `view_count`)
- `createQuestion(input)` / `updateQuestion(id, input)` / `deleteQuestion(id)`
- `createAnswer(input)` / `updateAnswer` / `deleteAnswer`
- `addComment` / `deleteComment`
- `vote(target_type, id, value)` → calls SQL `cast_vote`
- `acceptAnswer(id)`, `endorseAnswer(id)`
- `bookmarkQuestion(id, on)`
- `flagPost(target_type, id, reason)`
- `listMyQA()` — for profile tab
- `getQALeaderboard(period)`
- `getDailyQuestState()` / `claimDailyBonus()`
- `aiPolishQuestion(text, lang)` — Lovable AI Gateway, optional
- `aiTranslateAnswer(id, target_lang)` — cached

## 5. Routes

```
/qa                         → feed (tabs, search, filters)
/qa/ask                     → ask form (auth-gated)
/qa/$questionId             → question detail + answers + comments
/qa/$questionId/edit        → edit (owner / mod)
/qa/tag/$slug               → tag landing
/qa/leaderboard             → Q&A leaderboard
/qa/scholars                → list of verified scholars + their stats
/_authenticated/admin/qa    → mod queue: flags, scholar-review, categories
```

Profile gets a new **Q&A** tab showing: rep, answer streak, badges earned here, recent questions/answers.

## 6. UI components

- `QuestionCard` — list item: vote score · answer count · views · title · tags · author + age.
- `QuestionView` — detail with markdown, citations rendered as badges.
- `AnswerCard` — voting column on left, body, accept + endorse buttons, score animation on vote.
- `MarkdownEditor` — simple textarea + preview tabs (use `react-markdown` + `remark-gfm`, already installable).
- `TagInput` — chip input with autocomplete.
- `VoteButtons` — ↑ score ↓, optimistic update.
- `ReputationBadge` — pill with rep + level.
- `DailyQuestCard` — 3 checkboxes with progress.
- `LeaderboardTable` — reuses pattern from quiz leaderboard.
- `CitationPicker` — Surah + Ayah / Hadith book + number.
- `ScholarBadge`, `AcceptedBadge`, `EndorsedBadge`.

## 7. Build phases

**Phase A — MVP (ship first)**

1. Migration: categories, questions, answers, votes, comments, tags, RLS, SQL fns.
2. Server fns + routes for ask/answer/list/detail/vote/accept.
3. Markdown editor + tag input.
4. Mod can delete; admin manages categories.
5. Profile Q&A tab.

**Phase B — Gamification**
6. Reputation ledger, privilege gates, badges hooks into existing `profiles.badges`.
7. Q&A leaderboard route + profile rep display.
8. Daily quests card.
9. Notifications (in-app + push) for answers/accepts/mentions.

**Phase C — Polish & trust**
10. Search (tsvector), similar-questions-while-typing.
11. Scholar endorsement + scholar queue + verified badge.
12. Citations picker.
13. Flag/report + mod review queue.
14. Anonymous asking.
15. AI polish + AI translate (Lovable AI).
16. Bounties (optional, last).

## 8. Open questions for you

I'll ask these in a follow-up so we lock scope before building. Topics:

- Which gamification pieces from §2 do you want (rep + badges + leaderboard + quests, or fewer)?
- Should we include **anonymous questions**, **AI polish**, and **citations picker** in MVP or defer?
- Should one user be allowed multiple answers per question, or stick with one editable answer?
- Should downvoting cost reputation?

Once you confirm, I'll implement Phase A end-to-end in one go, then Phase B.