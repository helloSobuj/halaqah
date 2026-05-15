import { createFileRoute } from "@tanstack/react-router";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Dispatch due reminders. Called by pg_cron every minute.
// - Marks reminder.sent_at = now()
// - For each subscription belonging to the user, sends a Web Push (if VAPID keys are configured)
// - In-app: the notifications bell polls listMyReminders and shows due rows.

export const Route = createFileRoute("/api/public/hooks/dispatch-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("quiz_reminders")
          .select("id, user_id, quiz_id, tournament_id, message_en, message_bn, channels, quizzes(id, title_en), tournaments(id, name_en)")
          .is("sent_at", null)
          .lte("remind_at", now)
          .limit(200);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!due || due.length === 0) return Response.json({ sent: 0 });

        const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
        const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
        const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@halaqah.app";

        let pushSent = 0;
        for (const r of due) {
          const wantsPush = (r.channels ?? []).includes("push");
          const title = "Halaqah reminder";
          const body =
            r.message_en ||
            (r.quizzes ? `Your quiz "${(r.quizzes as any).title_en}" starts soon` : null) ||
            (r.tournaments ? `Tournament "${(r.tournaments as any).name_en}" is starting` : "Reminder");
          const url = r.quiz_id
            ? `/quiz/play/${r.quiz_id}`
            : r.tournament_id
              ? `/tournaments/${r.tournament_id}`
              : "/";

          if (wantsPush && VAPID_PUBLIC && VAPID_PRIVATE) {
            const { data: subs } = await supabaseAdmin
              .from("push_subscriptions")
              .select("endpoint, p256dh, auth")
              .eq("user_id", r.user_id);
            for (const s of subs ?? []) {
              try {
                const message = await buildPushPayload(
                  {
                    data: JSON.stringify({ title, body, url, tag: r.id }),
                    options: { ttl: 3600 },
                  },
                  { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                  { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE },
                );
                const res = await fetch(s.endpoint, message);
                if (res.status === 404 || res.status === 410) {
                  await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
                } else if (res.ok) {
                  pushSent++;
                }
              } catch (err) {
                console.error("push send failed", err);
              }
            }
          }

          await supabaseAdmin
            .from("quiz_reminders")
            .update({ sent_at: now })
            .eq("id", r.id);
        }

        return Response.json({ sent: due.length, pushSent });
      },
    },
  },
});
