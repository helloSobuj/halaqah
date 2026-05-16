## Goal
Use a single reusable Markdown editor everywhere descriptions/long text are entered, starting with the Videos admin (video + playlist descriptions), and render those descriptions as Markdown on the public pages.

## Changes

### 1. Promote the editor into a shared component
- New `src/components/shared/markdown-editor.tsx` — moved from `src/components/qa/markdown-editor.tsx`. Same API (`value`, `onChange`, `rows`, `placeholder`, `maxLength`), Write tab as the default. Keeps image upload via Supabase `qa-images` bucket.
- New `src/components/shared/markdown.tsx` — moved from `src/components/qa/markdown.tsx` (renderer used by both editor preview and public pages).
- Old `src/components/qa/markdown-editor.tsx` and `src/components/qa/markdown.tsx` become thin re-exports so existing imports (Q&A, library book form) keep working.

This becomes the canonical Markdown editor for all future long-text inputs.

### 2. Wire it into the Videos admin
In `src/routes/_authenticated/admin.videos.tsx`:
- Video dialog: replace the two `Textarea` description fields (EN + BN) with `<MarkdownEditor />`.
- Playlist dialog: same swap for EN + BN descriptions.
- Titles, slugs, URLs, speaker, etc. stay as plain `Input`/`Textarea`.

### 3. Render Markdown on the public Video pages
- `src/routes/videos.watch.$slug.tsx` — replace the `whitespace-pre-wrap <p>` description block with `<Markdown source={desc} />`.
- `src/routes/videos.playlist.$slug.tsx` — same swap for playlist description.

### 4. No backend / schema changes
Descriptions are already free-form text columns; storing Markdown is fully compatible.

## Out of scope
- Migrating Q&A, library book form, or other existing call sites (they already use the editor under its current path; the re-export keeps them working).
- A rich WYSIWYG toolbar — we keep the lightweight Write/Preview + image upload UX.
