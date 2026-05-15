# Phase 2 — Profile, Roles & Admin Shell

Building on the Phase 1 foundation (auth, i18n, theme, top-bar layout). This phase makes the user profile fully editable, wires the role system end-to-end, and creates the admin panel shell so Phase 3 modules can plug into it.

## What ships

### 1. Profile page (editable)
Replace the read-only `/profile` view with a tabbed page:
- **Identity tab** — avatar upload, display name, bio, location, gender, language preference, theme preference (synced to profile).
- **Stats tab** — points, current level, streak, badges (read-only, populated by future modules).
- **Saved tab** — bookmarked content placeholder (filled by Phase 3 modules: blog posts, Q&A, books, videos).
- **Activity tab** — recent quiz attempts, comments, answers (placeholder until Phase 3).

Avatar upload uses a new `avatars` storage bucket (public, user-scoped folder).

### 2. Roles wiring
- New `useUserRole()` hook returns the highest role the current user holds (`admin > moderator > scholar > user`).
- New `<RoleGate role="admin">…</RoleGate>` component for conditional UI.
- "Admin" item appears in the top-bar **More** dropdown only for admin/moderator/scholar.

### 3. Admin panel shell
- New layout route `src/routes/_authenticated/_admin.tsx` — gates the subtree on `has_role(user, 'admin' | 'moderator' | 'scholar')`. Non-privileged users get redirected to `/`.
- New `/admin` dashboard with cards for each future admin section (Notices, Events, Blog, Q&A, Quiz, Library, Videos, Users) — placeholders until each Phase 3 module ships.
- New `/admin/users` — admins can search users and assign/revoke roles. Backed by a `listUsers` + `setUserRole` server function (admin-only via `requireSupabaseAuth` + `has_role` check).
- Side rail navigation inside `/admin/*` (desktop) and a back-to-app button on mobile.

## Database changes

One migration:
- `avatars` storage bucket (public) + RLS policies (anyone can read; users can write only into their own `{user_id}/...` folder).
- New SQL function `get_user_highest_role(_user_id uuid)` returning the strongest `app_role` for a user (used by the admin user-list view).

No new tables — `profiles` and `user_roles` from Phase 1 already cover this phase.

## Server functions

In `src/lib/admin.functions.ts` (admin-gated via middleware):
- `listUsers({ search, page })` — joins `profiles` + `user_roles`, paginated.
- `setUserRole({ userId, role })` — admin-only insert/delete on `user_roles`.

In `src/lib/profile.functions.ts`:
- `updateProfile(input)` — validated with Zod, writes to `profiles` for the current user.
- `uploadAvatar(file)` — uploads to the `avatars` bucket and updates `profiles.avatar_url`.

## Files to create / edit

```text
NEW   src/hooks/use-user-role.tsx
NEW   src/components/role-gate.tsx
NEW   src/lib/profile.functions.ts
NEW   src/lib/admin.functions.ts
NEW   src/routes/_authenticated/_admin.tsx        (gated layout)
NEW   src/routes/_authenticated/_admin/index.tsx  (dashboard)
NEW   src/routes/_authenticated/_admin/users.tsx
EDIT  src/routes/_authenticated/profile.tsx      (tabs + edit form)
EDIT  src/components/app-shell.tsx               (More menu shows Admin for privileged roles)
EDIT  src/locales/en.json, src/locales/bn.json   (new strings)
```

## Out of scope (saved for later)
- Bookmarked/Activity content — depends on Phase 3 modules.
- Badge awarding logic — added per-module in Phase 3 (e.g., quiz badges).
- Full CRUD inside admin sections — added as each module ships.

## Confirm to proceed
Reply "go" and I'll start with the migration + profile editing, then admin shell, then user management.
