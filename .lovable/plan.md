## Blog Module — Plan

A simple, minimal blog with Categories, Tags, Posts. Markdown editor (existing `MarkdownEditor`) extended to support images, video, and audio embeds. Each post can have an optional admin-uploaded narration audio. Comments + suggested posts at the end.

### 1. Database (migration)

New tables (all with `created_at`, `updated_at`, RLS enabled):

- `**blog_categories**` — `slug` (unique), `name_en`, `name_bn`, `color`, `icon`, `sort_order`
- `**blog_tags**` — `slug` (unique), `label_en`, `label_bn`, `usage_count`
- `**blog_posts**` — `slug` (unique), `title_en`, `title_bn`, `excerpt_en`, `excerpt_bn`, `content_md_en`, `content_md_bn`, `cover_image_url`, `audio_url` (nullable — optional narration), `audio_duration_seconds` (nullable), `category_id`, `author_id`, `language`, `reading_minutes`, `is_published`, `is_featured`, `published_at`, `view_count`, `like_count`, `comment_count`
- `**blog_post_tags**` — join table (`post_id`, `tag_id`)
- `**blog_comments**` — `post_id`, `user_id`, `parent_id` (threaded), `body_md`, `is_deleted` (mirror Q&A/library pattern)
- `**blog_likes**` — `post_id`, `user_id` (unique)

**RLS:**

- Categories/tags: public read; staff (admin/moderator) write
- Posts: public read where `is_published = true`; staff write; authors can read their drafts
- Comments: public read (non-deleted); auth users insert their own; owner/staff update/delete
- Likes: auth users manage their own

**Storage buckets:**

- `blog-media` (public) — for editor-uploaded images/video/audio embeds (reuse existing `qa-images` pattern but media-typed)
- `blog-audio` (public) — for admin-uploaded narration audio (mp3/m4a/ogg/wav, ≤50MB)

**Function:** `bump_blog_view(_post_id uuid)` to increment view_count.

### 2. Shared Markdown editor — extend to media

Upgrade `src/components/qa/markdown-editor.tsx` (the shared one) with a new prop `mediaBucket` (default `qa-images`) and add:

- **Add video** button → uploads to bucket, inserts `<video src="…" controls></video>` HTML block (markdown allows raw HTML)
- **Add audio** button → uploads, inserts `<audio src="…" controls></audio>`
- File-type detection on paste/drop — already images; add video (mp4/webm) and audio (mp3/m4a/ogg/wav) with per-type size limits (image 5MB, audio 25MB, video 50MB)
- Renderer (`markdown.tsx`) already passes through HTML via `react-markdown` + `remark-gfm`; add a small sanitization allowlist if needed (keep `img`, `audio`, `video`, `source`, `iframe` for YouTube)
- YouTube/Vimeo URL paste → auto-convert to responsive `<iframe>` embed

Blog admin form uses `<MarkdownEditor mediaBucket="blog-media" />`.

### 3. Server functions — `src/lib/blog.functions.ts`

Public reads:

- `listBlogCategories()`
- `listBlogTags({ limit })`
- `listPosts({ categorySlug?, tagSlug?, q?, featured?, page, pageSize })` — paginated, published only
- `getPost({ slug })` → post + tags + author profile + `suggested` (4 latest from same category, excluding current)
- `listComments({ postId })` — threaded
- `bumpPostView({ id })`
- `togglePostLike({ id })` (auth)
- `addComment({ postId, body, parentId? })` / `deleteComment({ id })`

Admin (staff):

- `adminListPosts({ q?, status? })`
- `adminUpsertPost({ … , tagIds[] })` — auto-computes `reading_minutes` from content, auto-generates `slug`, sets `published_at` on first publish
- `adminDeletePost({ id })`
- `adminUpsertBlogCategory` / `adminDeleteBlogCategory`
- `adminUpsertBlogTag` / `adminDeleteBlogTag`
- `adminUploadBlogAudio` (returns public URL + duration via HTML5 probe done client-side — server just stores URL)

### 4. Routes

**Public:**

- `src/routes/blog.index.tsx` — minimal list. Featured strip on top, then grid of post cards (cover, title, excerpt, category badge, reading time, audio icon if narration exists, date). Filters: category pills, tag chips, search input.
- `src/routes/blog.category.$slug.tsx` — posts filtered by category
- `src/routes/blog.tag.$slug.tsx` — posts filtered by tag
- `src/routes/blog.$slug.tsx` — single post view

Replace existing `src/routes/blog.tsx` (currently ComingSoon).

**Single post layout (minimal):**

1. Cover image (full-width, max-height)
2. Category badge · reading time · published date · author
3. H1 title, then bilingual toggle if BN version exists
4. **Audio player** (sticky-on-scroll mini bar) — only if `audio_url` set. Shows "Listen to this article · X min". Standard `<audio controls>` with play/pause, scrub, speed (1x/1.25x/1.5x/2x).
5. Markdown content via `<Markdown />`
6. Tags row
7. Like + share buttons + view count
8. **Comments section** (reuse Q&A-style threaded comments with `MarkdownEditor` for replies)
9. **Suggested posts** — 4 cards under the heading "You might also like"

**Admin:** `src/routes/_authenticated/admin.blog.tsx` — tabbed UI (Posts / Categories / Tags), same shape as `admin.videos.tsx`.

- Post dialog fields: title (EN/BN), slug (auto, editable), excerpt, cover image upload, category select, tags multi-select (creatable), language, featured toggle, published toggle, **audio upload (optional)** with preview player + remove button, Markdown editor body (EN + BN tabs).

### 5. Wire-up

- Remove `soon: true` on `nav/admin.blog` in `admin.tsx` and `admin.index.tsx`
- Add new route to admin sidebar (already present, just enable)
- Add public `/blog` to main nav (already present, route exists as ComingSoon — replace)
- Update `src/locales/en.json` and `bn.json` with blog strings

### 6. Suggested UX extras (lightweight, included)

- **Reading progress bar** at top of post page (thin primary-colored line, scroll-linked)
- **Estimated reading time** auto-computed (200 wpm) on save
- **Bilingual toggle** per post when both EN/BN exist
- **Copy link / share** buttons (reuse existing share menu pattern from library/events)
- **Bookmark** posts (table `blog_bookmarks`) and a "My bookmarks" link on profile
- **RSS feed** at `/api/public/blog/rss.xml` (server route)
- **SEO**: per-post `<head>` with og:title, og:description from excerpt, og:image from cover, JSON-LD `Article` schema
- **Draft autosave** in admin (localStorage) so partial work isn't lost
- **Table of contents** auto-built from `##`/`###` headings, shown as sticky sidebar on desktop for long posts
- **Like (heart)** count

### 7. Out of scope (can be added later)

- Full WYSIWYG (we keep Write/Preview markdown)
- Scheduled publishing (`published_at` future dates)
- Comment voting/moderation queue
- Multi-author profiles page
- Newsletter subscriptions

### Files

**New:**

- `supabase/migrations/<ts>_blog_module.sql`
- `src/lib/blog.functions.ts`
- `src/components/blog/post-card.tsx`
- `src/components/blog/audio-player.tsx` (sticky listen bar)
- `src/components/blog/reading-progress.tsx`
- `src/components/blog/comments.tsx` (threaded; reuses MarkdownEditor)
- `src/components/blog/suggested-posts.tsx`
- `src/components/blog/tag-input.tsx` (creatable multi-select)
- `src/routes/blog.index.tsx`
- `src/routes/blog.$slug.tsx`
- `src/routes/blog.category.$slug.tsx`
- `src/routes/blog.tag.$slug.tsx`
- `src/routes/_authenticated/admin.blog.tsx`
- `src/routes/api/public/blog/rss.xml.ts`

**Edited:**

- `src/components/qa/markdown-editor.tsx` — add video/audio upload, `mediaBucket` prop
- `src/components/qa/markdown.tsx` — render `<audio>`, `<video>`, sanitized iframes
- `src/routes/blog.tsx` → delete (replaced by `blog.index.tsx`)
- `src/routes/_authenticated/admin.tsx` + `admin.index.tsx` — drop `soon: true` for blog
- `src/locales/en.json` + `bn.json`

Approve to implement, or tell me which suggested extras to drop.