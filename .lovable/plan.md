## Goal

Make the Blog module clickable from the admin panel so CRUD for posts/categories/tags is accessible. and show recent and populer blog in homepage

## Changes

1. `src/routes/_authenticated/admin.tsx` (line 32) — flip `soon: true` → `soon: false` on the `/admin/blog` nav entry.
2. `src/routes/_authenticated/admin.index.tsx` (line 15) — flip `soon: true` → `soon: false` on the `/admin/blog` card.

The `admin.blog.tsx` route already exists with full CRUD UI, so no other changes are needed.