import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env.VAPID_PUBLIC_KEY ?? null };
});

export const subscribePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        endpoint: z.string().url().max(1000),
        p256dh: z.string().min(1).max(300),
        auth: z.string().min(1).max(300),
        userAgent: z.string().max(300).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    // upsert by endpoint
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
        },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ endpoint: z.string().url() }).parse(i))
  .handler(async ({ data, context }) => {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const setQuizReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ quizId: z.string().uuid(), minutesBefore: z.number().int().min(1).max(1440).default(15) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("set_quiz_reminder", {
      _quiz_id: data.quizId,
      _minutes_before: data.minutesBefore,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const cancelQuizReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("quiz_reminders")
      .delete()
      .eq("user_id", context.userId)
      .eq("quiz_id", data.quizId)
      .is("sent_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("quiz_reminders")
      .select("*, quizzes(id, title_en, title_bn, timezone, starts_at), tournaments(id, name_en, name_bn, starts_at)")
      .eq("user_id", context.userId)
      .order("remind_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markReminderRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await supabaseAdmin
      .from("quiz_reminders")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const myQuizReminderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: r } = await supabaseAdmin
      .from("quiz_reminders")
      .select("id, remind_at, sent_at")
      .eq("user_id", context.userId)
      .eq("quiz_id", data.quizId)
      .is("sent_at", null)
      .maybeSingle();
    return r;
  });
