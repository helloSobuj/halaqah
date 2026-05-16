## Events Module — Plan

Replaces the current "Coming soon" `/events` placeholder with a full event module: discovery feed, event detail page, admin CRUD, RSVPs, reminders, and one-click social sharing (link + auto-generated share image with a QR code that resolves to the event URL).

### 1. Routes

- `/events` — public list (upcoming, past tabs, category + search filter)
- `/events/$eventId` — public detail page (cover image, title, when/where, description (markdown), RSVP button, share, attendees count, related events)
- `/admin/events` — staff list with create / edit / delete / publish
- `/admin/events/new` and `/admin/events/$eventId/edit` — form (title en/bn, slug, cover image upload, starts_at, ends_at, timezone, location (online/offline), venue, address, online_url, category, description_md en/bn, capacity, is_published, is_featured)
- `/api/public/events/$slug/share-image.png` — server route that renders the PNG share card with QR code (cached, regenerated when event updates)
- `/api/public/events/$slug/qr` — short redirect endpoint that the QR points at (gives us scan analytics + ability to swap target later); 302s to `/events/$eventId`

### 2. Database (migration)

- `event_categories` — `id, slug, name_en, name_bn, color, icon, sort_order, timestamps`
- `events` — `id, slug (unique), category_id, title_en, title_bn, description_md_en, description_md_bn, cover_image_url, starts_at, ends_at, timezone, mode ('online'|'offline'|'hybrid'), venue, address, online_url, capacity, is_published, is_featured, created_by, view_count, share_count, created_at, updated_at`
- `event_rsvps` — `event_id, user_id, status ('going'|'interested'|'cancelled'), created_at` (PK on event_id + user_id)
- `event_shares` — `id, event_id, channel ('link'|'image'|'whatsapp'|'facebook'|'x'|'telegram'|'qr_scan'), user_id (nullable), created_at` (analytics)
- Storage bucket `event-images` (public) for cover images + cached share PNGs
- RLS:
  - public read on published events, categories, rsvp counts
  - staff (admin/moderator) full write on events + categories
  - users insert/update/delete their own rsvp; counts via SECURITY DEFINER `event_attendance(_event_id)` returning `{going, interested}`
  - `event_shares` insert open to anyone (anon ok), select staff-only

### 3. Server functions (`src/lib/events.functions.ts`)

- `listEvents({ filter: 'upcoming'|'past'|'featured', categoryId?, q?, limit, cursor })`
- `getEventBySlug(slug)` — joins category, rsvp counts, my_rsvp
- `setMyRsvp({ eventId, status })` (auth)
- `adminUpsertEvent(input)` / `adminDeleteEvent(id)` / `adminUpsertCategory` (admin/moderator)
- `recordShare({ eventId, channel })` (anon-safe, debounced client-side)

### 4. Share image generation

Server route `/api/public/events/$slug/share-image.png`:

- Use `@resvg/resvg-wasm` + `satori` to render JSX → SVG → PNG (1200×630 OG size). Both work in the Cloudflare Worker runtime (WASM, no native deps).
- Layout: cover image background (dimmed), title, date/time in event timezone, venue line, app logo, QR code in bottom-right with a white rounded panel + "Scan to RSVP" caption.
- QR generated with `qrcode` (pure JS, Worker-safe) as a data URL pointing to `https://halaqah.lovable.app/api/public/events/{slug}/qr`.
- Response cached: store the rendered PNG in the `event-images` bucket at `share-cards/{eventId}-{updated_at_ts}.png`; the route redirects to the public storage URL after first render. Re-renders automatically when event is edited (cache key changes).
- `Cache-Control: public, max-age=86400, immutable` on the storage URL.

QR redirect route `/api/public/events/$slug/qr`:

- Looks up event, increments `event_shares` with channel `qr_scan`, then 302 to `/events/$eventId`. Idempotent and cheap.

### 5. Share UI (`src/components/events/share-menu.tsx`)

Dropdown on the event detail page and on each event card:

- **Copy link** — copies `https://halaqah.lovable.app/events/{slug}`, toast "Link copied"
- **Download image** — fetches the share-image PNG and triggers download
- **WhatsApp / Facebook / X / Telegram** — `share-image.png` URL is set as `og:image` on the detail page so previews look good; menu items open `https://wa.me/?text=...`, `https://www.facebook.com/sharer/sharer.php?u=...`, `https://twitter.com/intent/tweet?...`, `https://t.me/share/url?...`
- **Native share** — uses `navigator.share({ title, text, url, files: [pngFile] })` when available (mobile)
- Each action calls `recordShare(channel)`

Each event detail route's `head()` sets `og:image`, `twitter:image`, `twitter:card=summary_large_image` to the share-image URL.

### 6. UI components

- `src/components/events/event-card.tsx` — cover, date chip, title, venue, RSVP count, share button
- `src/components/events/event-form.tsx` — admin form with cover-image upload (storage), datetime + timezone pickers, markdown editor (reuse existing `MarkdownEditor`), mode toggle
- `src/components/events/rsvp-button.tsx` — going / interested / cancel, optimistic
- `src/components/events/share-menu.tsx` — see above
- `src/components/events/event-hero.tsx` — detail page hero with cover, countdown, RSVP, share

### 7. i18n

New `events.*` namespace in `src/locales/en.json` and `bn.json` covering: list, filters, detail, rsvp states, share menu labels, admin form.

### 8. Wiring

- Replace `src/routes/events.tsx` with the real list route
- Unmark `events` as `soon` in `src/routes/_authenticated/admin.tsx` SECTIONS
- Add Events tile already exists on home grid

### 9. Out of scope (deferred)

- Ticketing / payments
- Recurring events
- Calendar (.ics) export — can be a small follow-up; trivial once events exist
- Comments on events
- Email/push reminders for RSVP'd users (will reuse `quiz_reminders` pattern later)

### Implementation order

1. Migration (tables, RLS, storage bucket) + helper SQL functions
2. Server functions (`events.functions.ts`)
3. Public list + detail routes with RSVP
4. Share menu (link + social deep links, native share)
5. Share-image server route + QR redirect route
6. Admin CRUD pages
7. i18n strings, polish, replace placeholder `/events`

Approve and I'll execute in this order.
