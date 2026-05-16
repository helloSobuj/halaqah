## Library Module — Plan

Replaces the `/library` "Coming Soon" placeholder with a full Islamic book library. Each book has a single language tag (Arabic / English / Bangla / Urdu…) — no bilingual title/description fields. Books can be either an uploaded PDF (stored in Lovable Cloud) or an external link (Archive.org, Sunnah.com, etc.). Users can search, filter, bookmark, download, share, rate, and comment. Logged-in users can submit books that admins/moderators approve before they go public.

### 1. Routes

- `/library` — discovery page: search bar, filters (category, language, author, format), sort (newest / most downloaded / top rated), grid of book cards
- `/library/$bookId` — book detail: cover, title, author, description, category, language, pages, file size, "Read PDF" (inline viewer) / "Open external link", Download, Share, Bookmark, average rating, rating form, comments thread
- `/library/submit` — authenticated form: users propose a new book (PDF upload OR external URL), status starts as `pending`
- `/library/my-submissions` — user sees their submitted books with status badges (pending / approved / rejected + reason)
- `/_authenticated/admin/library` — admin/moderator CRUD: list all books, filter by status, edit/delete, approve/reject submissions, manage categories
- `/_authenticated/admin/library/categories` — manage library categories (small dialog like quiz/event categories)

### 2. Database (migration)

- `library_categories` — `slug, name_en, name_bn, color, icon, sort_order`
- `library_books`
  - identity: `id, slug (unique)`
  - content: `title, author, description, language` (text tag: `ar`/`en`/`bn`/`ur`/`other`), `category_id`, `cover_image_url`, `published_year`, `pages`
  - file: `source_type` (`'pdf' | 'external'`), `pdf_path` (storage object path), `pdf_size_bytes`, `external_url`
  - moderation: `status` (`'pending' | 'approved' | 'rejected'`), `submitted_by` (user id), `reviewed_by`, `reviewed_at`, `rejection_reason`
  - stats: `download_count`, `view_count`, `share_count`, `avg_rating numeric(3,2)`, `rating_count`
  - flags: `is_featured`, timestamps
- `library_bookmarks` — `book_id, user_id, created_at` (PK on book + user)
- `library_ratings` — `book_id, user_id, value (1..5), created_at, updated_at` (PK on book + user). Trigger recomputes `library_books.avg_rating, rating_count`.
- `library_comments` — `id, book_id, user_id, body_md, parent_id (nullable, for one-level replies), is_deleted, created_at, updated_at`
- `library_downloads` — `id, book_id, user_id (nullable for anon), created_at` (lightweight analytics; bumps `download_count`)
- Storage bucket `library-books` (public read) for PDFs and cover images
- RLS:
  - public read on `approved` books, categories, ratings, non-deleted comments
  - authenticated users insert their own bookmark/rating/comment/download; update/delete only their own
  - authenticated users insert `library_books` with `status='pending'` and `submitted_by=auth.uid()` only
  - admin/moderator full write on books + categories; only they can change `status`, `is_featured`, `rejection_reason`

### 3. Server functions (`src/lib/library.functions.ts`)

- `listBooks({ q?, categoryId?, language?, sourceType?, sort?, limit, cursor })` — only approved, with my_bookmark flag
- `getBookBySlug(slug)` — book + category + my_bookmark + my_rating + counts; bumps `view_count`
- `listComments(bookId)` / `addComment({ bookId, body_md, parent_id? })` / `deleteComment(id)`
- `setMyRating({ bookId, value })` / `clearMyRating(bookId)` (auth)
- `toggleBookmark(bookId)` (auth)
- `recordDownload(bookId)` (auth or anon)
- `submitBook(input)` (auth, inserts with `status='pending'`)
- `myBookSubmissions()` (auth)
- `adminListBooks({ status? })` / `adminUpsertBook` / `adminDeleteBook` / `adminApproveBook(id)` / `adminRejectBook(id, reason)` / `adminUpsertCategory`

### 4. UI components (`src/components/library/`)

- `book-card.tsx` — cover, title, author, language chip, rating stars, download count, bookmark icon
- `book-filters.tsx` — category pills + language select + format toggle + sort dropdown + search input (debounced)
- `book-rating.tsx` — interactive star input + average display
- `book-comments.tsx` — markdown editor (reuse existing `MarkdownEditor`), threaded view (one level), delete-own
- `book-share-menu.tsx` — copy link, WhatsApp / Facebook / Telegram, native share (reuses pattern from events module)
- `pdf-viewer.tsx` — lightweight inline viewer using a native `<iframe>` to the storage URL (`#toolbar=1`), with full-screen + download fallback. No heavy PDF.js dependency.
- `book-form.tsx` — shared form used by both user-submission page and admin upsert; handles PDF upload to `library-books` bucket, cover image upload, source-type toggle (pdf vs external URL), category + language pickers
- `submission-status-badge.tsx` — pending / approved / rejected pill

### 5. Share & SEO

- Book detail route `head()` sets `og:image` (cover), `og:title`, `og:description`, `twitter:card=summary_large_image`
- Share menu: copy link, WhatsApp / Facebook / Telegram / X, `navigator.share` on mobile
- (No QR / generated share image for v1 — can be added later; events module already proves the pattern.)

### 6. Reader & download UX

- PDF books: "Read" opens the inline `<iframe>` viewer in a modal/route; "Download" hits a tiny server-fn that increments `download_count` then returns the public storage URL the client redirects to
- External books: "Open" opens `external_url` in a new tab and fires `recordDownload` for analytics parity

### 7. i18n

Add `library.*` namespace in `src/locales/en.json` and `src/locales/bn.json`:
list/filter labels, sort options, language names, detail page labels, rating prompts, comment prompts, share menu, submission form labels + status, admin labels, empty states.

### 8. Wiring

- Replace `src/routes/library.tsx` (currently `ComingSoonPage`) with the real list route → rename to `src/routes/library.index.tsx` to avoid the same nested-route bug we hit on events
- Unmark `library` as `soon` in `src/routes/_authenticated/admin.index.tsx`
- Existing `Library` tile on home already links to `/library` — no nav change needed

### 9. Out of scope (deferred)

- Reading progress / resume position
- Multi-language books (one record per language for now)
- Comment voting / nested >1 level
- Full-text search inside PDFs
- EPUB / audio formats

### Implementation order

1. Migration (tables, RLS, storage bucket, rating recompute trigger)
2. Server functions (`library.functions.ts`)
3. Public list + detail + reader + share/bookmark/download/rating/comments
4. User submission flow (`/library/submit`, `/library/my-submissions`)
5. Admin CRUD + approval queue + categories
6. i18n strings, replace placeholder route, unmark "soon"

Approve and I'll execute in this order.
