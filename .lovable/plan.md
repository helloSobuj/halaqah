## Homepage Redesign Plan

### Target layout (desktop)

```
┌─────────────────────────────────────────────────────────────┐
│                          NAVBAR                             │
├─────────────────────────────────────────────────────────────┤
│                       HERO SECTION                          │
│   (gradient backdrop + tagline + CTA + animated accent)     │
├─────────────────────────────────────────────────────────────┤
│  MODULES (2/3 width, 3 cards/row)     │  NOTICE BOARD (1/3) │
│  ┌──────┐ ┌──────┐ ┌──────┐           │  ┌────────────────┐ │
│  │ Quiz │ │ Q&A  │ │ Blog │           │  │ Pinned notice  │ │
│  └──────┘ └──────┘ └──────┘           │  ├────────────────┤ │
│  ┌──────┐ ┌──────┐ ┌──────┐           │  │ Notice 2       │ │
│  │ Lib  │ │ Vids │ │Events│           │  ├────────────────┤ │
│  └──────┘ └──────┘ └──────┘           │  │ Notice 3       │ │
│                                       │  │ [See all →]    │ │
├───────────────────────────────────────┴────────────────────┤
│  RECENT QUIZ   │   RECENT EVENT   │   DAILY HADITH (AI)   │
├────────────────┴──────────────────┴───────────────────────┤
│  Q&A (2 cols, list of 4)   │   LIBRARY   │   VIDEOS        │
├────────────────────────────┴─────────────┴────────────────┤
│              RECENT BLOG POSTS (4 cards)                   │
├────────────────────────────────────────────────────────────┤
│  FOOTER — Designed & developed by Sobuj Hossen             │
└────────────────────────────────────────────────────────────┘
```

Mobile: stacks to 1 col; modules grid becomes 2 cols; the 3-col and 4-col strips collapse to 1 col.

### Implementation steps

1. **Refactor `src/routes/index.tsx**` into a composition of small section components (Hero, ModulesGrid, NoticeColumn, TripleStrip, QALibraryVideos, BlogStrip, Footer). Keep them in the same file or extract to `src/components/home/`.
2. **Hero** — keep current copy but add a soft animated gradient blob (CSS only, no JS lib), a small "verse of the day" line, and primary + secondary CTA.
3. **Modules + Notice row** — CSS grid `lg:grid-cols-3`; modules occupy `col-span-2` with inner `grid-cols-2 lg:grid-cols-3`; notice board occupies `col-span-1`, vertical stacked cards (compact, no big cover image in this column — small thumb only).
4. **Triple strip** — Recent Quiz (latest quiz card), Recent Event (next upcoming event card), Daily Hadith. Each is a `Card` with a "View more" link.
5. **Daily Hadith** — new server function `getDailyHadith` calling Lovable AI Gateway (`google/gemini-3-flash-preview`) with a deterministic prompt seeded by today's date, cached in a small `daily_hadith` table (one row per date) so we only call the AI **once per day** for the entire app (huge credit save). Returns BN + EN + source.
6. **Q&A / Library / Videos row** — Q&A spans 2 cols showing 4 question rows; Library shows 2 recent approved books; Videos shows 2 recent videos.
7. **Blog strip** — 4-column grid of most recent posts (replaces current two separate strips).
8. **Footer** — new `src/components/site-footer.tsx` with module links, language toggle reminder, and "Designed & Developed by [Sobuj Hossen](https://sobujhossen.com)".
9. **Reuse existing card components**: `PostCard`, `VideoCard`, `BookCard`, `EventCard`, `QuizCard` — no new card designs needed.
10. **i18n** — all new strings go through existing `useTranslation` keys; fixes the current SSR hydration mismatch (Home vs হোম) by ensuring language is read consistently.

### Technical notes

- New server fn `getDailyHadith` in `src/lib/hadith.functions.ts` + table `daily_hadith (date date pk, arabic text, en text, bn text, source text, created_at)`. Uses Lovable AI Gateway — no extra API key needed (`LOVABLE_API_KEY` already provisioned).
- All section queries use `useQuery` with `staleTime: 5 * 60_000` to avoid refetch storms.
- Existing functions already accept `limit` — no backend changes needed for quiz/events/qa/library/videos beyond adding small `limit` defaults where missing.
- Fix the SSR hydration error by reading `i18n.resolvedLanguage` only after mount (or using `suppressHydrationWarning` on the language-dependent nav labels).

### How to save credits on this redesign

1. **One big prompt, one implementation pass** — approve this plan as-is so I build everything in a single message instead of iterating section by section. Each chat round costs credits; batching saves the most.
2. **No design directions / prototypes** — skip the visual A/B `create_directions` flow; pick the layout from this plan directly. Each design exploration round = extra credits.
3. **Reuse existing card components** (PostCard, VideoCard, etc.) — no new component designs, no image generation.
4. **No new images** — use CSS gradients + lucide icons for the hero accent instead of `imagegen`.
5. **Cache the Daily Hadith** per date so the AI call runs ~1×/day total, not per visitor.
6. **Skip unnecessary polish rounds** — tell me upfront if you want animations/motion; otherwise I'll keep it CSS-only.
7. **Bundle small fixes** (e.g. the i18n hydration bug) into this same redesign turn instead of separate messages.
  &nbsp;

# Add extra featurs

- **Top contributors leaderboard** mini-widget (Q&A points).
- **Hijri date** chip next to Gregorian date in hero.
- **PWA install prompt banner** (you already have `public/sw.js`) for mobile users.
  &nbsp;

&nbsp;

### Files to create / edit

- create: `src/components/home/hero.tsx`, `src/components/home/modules-grid.tsx`, `src/components/home/notice-column.tsx`, `src/components/home/triple-strip.tsx`, `src/components/home/qa-library-videos.tsx`, `src/components/home/daily-hadith.tsx`, `src/components/site-footer.tsx`
- create: `src/lib/hadith.functions.ts`
- create: migration for `daily_hadith` table
- edit: `src/routes/index.tsx` (compose new sections), `src/components/app-shell.tsx` (mount footer), nav label hydration fix