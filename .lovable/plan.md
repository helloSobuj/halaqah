# Chunk 3 — Tournaments + Reminders (shipped)

Daily quiz module was removed per user request. The remaining work:

## Tournaments (single-quiz bracket)
- Tables: `tournaments`, `tournament_participants`, `tournament_matches`.
- SQL: `start_tournament(id)` seeds a 4/8/16/32-player bracket from registration order, auto-byes for missing slots, links `next_match_id`/`next_slot` for advancement. `submit_tournament_match(match_id, attempt_id)` records a player's score and auto-advances the winner (tiebreak: faster time).
- Server fns: `listTournaments`, `getTournament`, `upsertTournament`, `deleteTournament`, `joinTournament`, `leaveTournament`, `startTournamentBracket`, `submitMatchResult`, `getMyActiveMatch`.
- Routes: `/tournaments`, `/tournaments/$id` (registration + bracket view), `/_authenticated/admin/tournaments`.

## Reminders + Browser Push
- Tables: `quiz_reminders`, `push_subscriptions`.
- Service worker at `public/sw.js` (push + click only — no caching).
- Client helper `src/lib/push-client.ts` registers SW and subscribes; guards against iframe/preview hosts and missing VAPID keys.
- Server fns: `subscribePush`, `unsubscribePush`, `setQuizReminder`, `cancelQuizReminder`, `listMyReminders`, `markReminderRead`, `myQuizReminderStatus`, `getVapidPublicKey`.
- Cron: `dispatch-quiz-reminders` runs every minute -> `POST /api/public/hooks/dispatch-reminders` which sends Web Push via `@block65/webcrypto-web-push` (edge-compatible) and marks reminders sent.
- UI: `<NotificationsBell />` in header; `<ReminderButton />` on quiz cards with future `starts_at`.

## To enable browser push (one-time)
1. Generate VAPID keys locally: `npx web-push generate-vapid-keys`
2. Add three secrets in Cloud: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (e.g. `mailto:you@domain`).
3. Push only fires on the deployed/published site, never inside the editor preview iframe.

Without VAPID keys: in-app reminders + the bell still work; push is a no-op.
