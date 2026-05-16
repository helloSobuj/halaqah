# Finish Library Module

Wrap up the remaining pieces from the library plan now that the core (catalog, detail, submit, DB, server fns) is shipped.

## 1. User submissions view
- `src/routes/library.my-submissions.tsx` — list current user's submissions with status badge (pending / approved / rejected + rejection reason). Uses `myBookSubmissions` server fn.
- Add link to it from `/library/submit` and from the library index header (when authenticated).

## 2. Admin pages
- `src/routes/_authenticated/admin.library.tsx` — table of all books with filters (status, language, category), columns: cover, title, author, language, status, downloads, rating, submitted_by. Row actions: Edit, Delete, Approve, Reject (with reason dialog), Toggle featured. Uses `BookForm` in a dialog for create/edit.
- `src/routes/_authenticated/admin.library.categories.tsx` — CRUD for `library_categories` (slug, name_en/bn, color, icon, sort_order).
- Add both entries to the admin index card grid.

## 3. i18n
- Add `library.*` namespace to `src/locales/en.json` and `src/locales/bn.json` covering: catalog (search/filter/sort labels, empty states), book detail (read PDF, open external, download, share, bookmark, rate, comments), submission form, my-submissions (status labels), admin (table headers, approve/reject dialogs).
- Wire `useTranslation` into all library route components and `BookCard`, `BookForm`, `BookShareMenu`, `StarRating`.

## 4. Unmark "soon"
- In `src/routes/_authenticated/admin.index.tsx`, remove the `soon` flag from the Library card so it becomes a live link to `/admin/library`.
- In the public dashboard / module grid (wherever `library` is shown as `soon`), unmark it the same way.

## Out of scope (deferred from earlier)
Reading progress, multi-language books, comment voting, full-text PDF search, EPUB/audio.

## Order of work
1. my-submissions route
2. admin library list + form dialog + approve/reject
3. admin categories CRUD
4. i18n strings + wiring
5. Unmark soon in both admin and public module grids
