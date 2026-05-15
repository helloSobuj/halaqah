# Islamic Community Web App — Build Plan

A bilingual (Bangla/English), light/dark themed community platform inspired by duaruqyah.com — clean cards, generous spacing, soft greens/teals, Bangla-first typography. Built on TanStack Start + Lovable Cloud (Postgres, auth, storage). Desktop uses a sidebar+content shell; mobile uses a native-feel bottom-tab layout with stacked screens.  
app name: Halaqah | হালাকাহ

## Phased delivery

I'll break this into shippable phases so we can iterate. Each phase ends with a working preview.

### Phase 1 — Foundation

- Lovable Cloud (auth, database, storage)
- Email/password auth, profile auto-creation, session handling
- i18n setup (BN/EN) with language switcher persisted to profile
- Theme system (light/dark) with semantic tokens matching duaruqyah's aesthetic
- Responsive shell: desktop sidebar + topbar; mobile bottom tabs + stacked navigation
- Home/dashboard skeleton

### Phase 2 — Profile & Roles

- User profile: name, avatar, bio, location, gender, language, theme prefs
- Gamification fields: points, streaks, badges, level
- Saved/bookmarked content (books, videos, Q&A, blog)
- Save Quiz Results
- Roles: `user`, `moderator`, `scholar`, `admin` (separate `user_roles` table, `has_role` security-definer function)
- Admin panel shell (role-gated `/admin`)

### Phase 3 — Content modules (built in order, each ships independently)

1. **Notice Board** — pinned/dated announcements, admin CRUD
2. **Events** — listing, detail page, RSVP/registration, capacity, calendar export, admin CRUD
3. **Blog** — posts with categories, cover image, comments, upvotes, moderator publish flow
4. **Islamic Q&A** (StackOverflow/Reddit style) — questions, tags, answers, upvotes/downvotes, accepted answer, scholar-verified badge, comments, search
5. **Quiz module** — categories, timed quizzes, MCQ, scoring, streaks, badges, **leaderboard** (Per Quizz, weekly + all-time), admin question bank
6. **Online Library** — books with category/author/title search, external URL link, cover image, admin CRUD
7. **Video Library** — YouTube embeds with categories, search, admin CRUD

### Phase 4 — Daily Islamic widgets (home dashboard)

- Hijri calendar date
- Daily dua + daily hadith rotating cards 
- Tasbih counter (digital dhikr, persists per-user)

### Phase 5 — Engagement

- In-app notifications (event registration, Q&A replies, blog comments, notices)
- Comments + upvotes wired across blog & Q&A
- Profile activity feed

## Technical design

**Stack**: TanStack Start (React 19, Vite 7), Tailwind v4 with semantic tokens in `src/styles.css`, shadcn/ui, Lovable Cloud (Supabase under the hood). Server logic via `createServerFn` (no edge functions).

**Routing** (file-based, separate routes for SEO):

```
/                  home + widgets
/notices /events /events/$id
/blog /blog/$slug
/qa /qa/$id /qa/ask
/quiz /quiz/$id /quiz/leaderboard
/library /library/$id
/videos /videos/$id
/profile /profile/settings
/login /signup
/_authenticated/*  (gated subtree)
/_authenticated/_admin/*  (admin/mod/scholar gated)
```

**i18n**: `react-i18next` with `bn` and `en` JSON resources; language stored on profile, fallback to browser. Bangla font (e.g., Noto Sans Bengali / Hind Siliguri) loaded for `lang=bn`.

**Theme**: CSS variables in `src/styles.css` (oklch). Greens/teals primary, warm cream surfaces in light, deep charcoal in dark. `.dark` class toggled and persisted.

**Layouts**:

- Desktop (≥1024px): collapsible sidebar nav + content area + right rail for widgets on home
- Mobile: top app bar + scrollable content + fixed bottom tab bar (Home, Learn, Community, Profile); secondary screens push as full-screen routes for native feel
- Single component tree with `useIsMobile()` to swap shell

**Database (high level)**:
`profiles`, `user_roles`, `notices`, `events`, `event_registrations`, `blog_posts`, `blog_comments`, `blog_votes`, `qa_questions`, `qa_answers`, `qa_votes`, `qa_comments`, `quiz_categories`, `quiz_questions`, `quiz_attempts`, `quiz_leaderboard` (view), `books`, `videos`, `bookmarks`, `tasbih_counts`, `notifications`, `daily_content` (dua/hadith).
RLS on all tables; admin/mod/scholar checks via `has_role()`.

**Storage buckets**: `avatars` (public), `event-covers` (public), `blog-covers` (public), `book-covers` (public).

## Out of scope for v1 (can add later)

Prayer times, phone auth, push notifications, Quran reader.

## What I need from you to start

Confirm the plan and I'll begin with **Phase 1 (Foundation)**. After it's working in preview, we'll move to Phase 2, then tackle modules one-by-one in Phase 3 so you can review each before the next.