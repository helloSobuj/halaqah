## Goal

Replace the Videos coming-soon stub with a full module backed by YouTube links. Users browse by category, open a playlist, and watch any video. Admin (and moderator) can CRUD categories, playlists, and videos.

## Data model (new tables)

- **video_categories** — `id`, `slug`, `name_en`, `name_bn`, `color`, `icon`, `sort_order`, timestamps.
- **video_playlists** — `id`, `slug`, `category_id` (nullable), `title_en`, `title_bn`, `description_en`, `description_bn`, `cover_image_url`, `youtube_playlist_id` (optional — for "import all from this YouTube playlist" later, but not required for MVP), `is_published`, `is_featured`, `sort_order`, `view_count`, `created_by`, timestamps.
- **videos** — `id`, `slug`, `playlist_id` (nullable — videos can live in a playlist or stand alone in a category), `category_id` (nullable, denormalised for direct category browsing), `title_en`, `title_bn`, `description_en`, `description_bn`, `youtube_url` (raw), `youtube_video_id` (parsed, indexed), `thumbnail_url` (default to `https://i.ytimg.com/vi/<id>/hqdefault.jpg` when blank), `duration_seconds` (nullable), `speaker`, `language` (`en`|`bn`|`ar`), `is_published`, `is_featured`, `sort_order`, `view_count`, `created_by`, timestamps.

All three get RLS:

- Public can read `is_published = true` (categories: always public).
- Admin / moderator can do all writes (`has_role(auth.uid(), 'admin' | 'moderator')`).

A `bump_video_view(_video_id uuid)` SQL function increments `view_count`.

## Server functions (`src/lib/videos.functions.ts`)

Public (no auth):

- `listVideoCategories()` — sorted categories.
- `listPlaylists({ categorySlug?, featured?, limit? })` — published playlists + category join + first-video thumbnail fallback.
- `getPlaylist({ slug })` — playlist + its published videos ordered by `sort_order`.
- `listVideos({ categorySlug?, q?, featured?, limit?, offset? })` — published videos.
- `getVideo({ slug })` — single published video + sibling videos from the same playlist.
- `bumpVideoView({ id })` — fire-and-forget RPC.

Auth-protected (`requireSupabaseAuth` + role check inside handler):

- `adminListPlaylists`, `adminListVideos` (include unpublished, support filters).
- `adminUpsertVideoCategory`, `adminDeleteVideoCategory`.
- `adminUpsertPlaylist`, `adminDeletePlaylist`.
- `adminUpsertVideo`, `adminDeleteVideo` — accepts raw YouTube URL, parses the video id with a small helper (`extractYouTubeId`) that handles `youtu.be/<id>`, `youtube.com/watch?v=<id>`, `youtube.com/shorts/<id>`, `youtube.com/embed/<id>`. Rejects when no id can be parsed.

## Routes

Public pages, under existing `/videos`:

- `src/routes/videos.tsx` — converted from coming-soon into a layout with `<Outlet />`.
- `src/routes/videos.index.tsx` — landing: featured row, categories grid, recent videos grid. SEO head per page.
- `src/routes/videos.category.$slug.tsx` — playlists in a category + standalone videos.
- `src/routes/videos.playlist.$slug.tsx` — playlist detail (cover, description, ordered video list, "Play all" → first video).
- `src/routes/videos.watch.$slug.tsx` — player page. Embeds YouTube via `<iframe src="https://www.youtube.com/embed/<id>?rel=0">` with `aspect-video` wrapper, shows title/speaker/description, "Up next" sidebar with sibling playlist videos, share buttons.

Admin pages, under `/admin/videos` (currently marked `soon: true` — flip to enabled in `admin.tsx` and `admin.index.tsx`):

- `src/routes/_authenticated/admin.videos.tsx` — wraps the section in `<Tabs>`: **Videos**, **Playlists**, **Categories** (same pattern we just used for `admin.library.tsx`).
- Each tab: list + search/filter + create / edit dialog + delete confirm.
- Video form: title (en/bn), description (en/bn), YouTube URL with live id-extract preview + thumbnail preview, category select, playlist select (optional), speaker, language, published toggle, featured toggle, sort order.
- Playlist form: title (en/bn), description, category, cover image (optional), published, featured, sort order.
- Category form: slug (auto from name_en), name_en, name_bn, color picker, icon, sort_order — mirrors library categories.

## Shared components

- `src/components/videos/video-card.tsx` — thumbnail + title + meta, used on every list.
- `src/components/videos/playlist-card.tsx` — playlist tile with video count.
- `src/components/videos/youtube-player.tsx` — responsive embed wrapper.
- `src/lib/youtube.ts` — `extractYouTubeId(url)` + `youtubeThumbnail(id)` + `youtubeEmbedUrl(id)` (client-safe; reused server-side too).

## Navigation, i18n, SEO

- Keep `/videos` in the existing top nav (already there).
- Add admin entry: enable the existing `/admin/videos` entry in both admin sidebar (`admin.tsx`) and dashboard card (`admin.index.tsx`); remove `soon: true`.
- Add `nav.videos`, `videos.*`, `admin.videos.*` strings in `src/locales/en.json` and `src/locales/bn.json` for the new screens.
- Each route file sets a unique `head()` with title/description/og:image (use video thumbnail or playlist cover when relevant).

## Out of scope (mention so we agree)

- YouTube Data API integration / auto-import a playlist's videos by id — not needed for MVP; admins paste links one at a time. We keep `youtube_playlist_id` as a forward-looking field but don't sync.
- Comments, ratings, bookmarks on videos.
- Auto-fetching duration from YouTube (admin can fill it in manually if they want it displayed).