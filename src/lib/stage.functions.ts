import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.includes("admin") && !roles.includes("moderator")) {
    throw new Error("Forbidden");
  }
}

async function ensureStageRow(eventId: string) {
  const { data } = await supabaseAdmin
    .from("event_stage_state")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (!data) {
    await supabaseAdmin.from("event_stage_state").insert({ event_id: eventId });
  }
}

// ------------------- Stage state -------------------

export const getStageState = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: state } = await supabaseAdmin
      .from("event_stage_state")
      .select("*")
      .eq("event_id", data.eventId)
      .maybeSingle();
    const { data: speakers } = await supabaseAdmin
      .from("event_speakers")
      .select("*")
      .eq("event_id", data.eventId)
      .order("start_minute", { ascending: true });
    return { state, speakers: speakers ?? [] };
  });

export const setCurrentSpeaker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        eventId: z.string().uuid(),
        speakerId: z.string().uuid().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    await ensureStageRow(data.eventId);
    let remaining = 0;
    if (data.speakerId) {
      const { data: sp } = await supabaseAdmin
        .from("event_speakers")
        .select("duration_minutes")
        .eq("id", data.speakerId)
        .maybeSingle();
      remaining = (sp?.duration_minutes ?? 0) * 60;
    }
    const { error } = await supabaseAdmin
      .from("event_stage_state")
      .update({
        current_speaker_id: data.speakerId,
        timer_started_at: null,
        timer_paused_at: null,
        timer_remaining_seconds: remaining,
      })
      .eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    await ensureStageRow(data.eventId);
    const { data: cur } = await supabaseAdmin
      .from("event_stage_state")
      .select("timer_remaining_seconds, timer_paused_at")
      .eq("event_id", data.eventId)
      .maybeSingle();
    await supabaseAdmin
      .from("event_stage_state")
      .update({
        timer_started_at: new Date().toISOString(),
        timer_paused_at: null,
        timer_remaining_seconds: cur?.timer_remaining_seconds ?? 0,
      })
      .eq("event_id", data.eventId);
    return { ok: true };
  });

export const pauseTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: cur } = await supabaseAdmin
      .from("event_stage_state")
      .select("timer_started_at, timer_remaining_seconds")
      .eq("event_id", data.eventId)
      .maybeSingle();
    if (!cur) return { ok: true };
    let remaining = cur.timer_remaining_seconds ?? 0;
    if (cur.timer_started_at) {
      const elapsed = Math.floor((Date.now() - new Date(cur.timer_started_at).getTime()) / 1000);
      remaining = Math.max(0, remaining - elapsed);
    }
    await supabaseAdmin
      .from("event_stage_state")
      .update({
        timer_started_at: null,
        timer_paused_at: new Date().toISOString(),
        timer_remaining_seconds: remaining,
      })
      .eq("event_id", data.eventId);
    return { ok: true };
  });

export const adjustTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ eventId: z.string().uuid(), deltaSeconds: z.number().int() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: cur } = await supabaseAdmin
      .from("event_stage_state")
      .select("timer_started_at, timer_remaining_seconds")
      .eq("event_id", data.eventId)
      .maybeSingle();
    if (!cur) return { ok: true };
    let remaining = cur.timer_remaining_seconds ?? 0;
    if (cur.timer_started_at) {
      const elapsed = Math.floor((Date.now() - new Date(cur.timer_started_at).getTime()) / 1000);
      remaining = Math.max(0, remaining - elapsed);
    }
    remaining = Math.max(0, remaining + data.deltaSeconds);
    await supabaseAdmin
      .from("event_stage_state")
      .update({
        timer_remaining_seconds: remaining,
        timer_started_at: cur.timer_started_at ? new Date().toISOString() : null,
      })
      .eq("event_id", data.eventId);
    return { ok: true };
  });

export const setAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        eventId: z.string().uuid(),
        text: z.string().max(500).nullable(),
        active: z.boolean(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    await ensureStageRow(data.eventId);
    await supabaseAdmin
      .from("event_stage_state")
      .update({ announcement_text: data.text, announcement_active: data.active })
      .eq("event_id", data.eventId);
    return { ok: true };
  });

// ------------------- Event Q&A -------------------

export const askEventQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        eventId: z.string().uuid(),
        title: z.string().min(6).max(200),
        body: z.string().max(4000).default(""),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("slug")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!ev) throw new Error("Event not found");

    const { data: q, error } = await supabaseAdmin
      .from("qa_questions")
      .insert({
        user_id: context.userId,
        title: data.title,
        body_md: data.body,
        event_id: data.eventId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.rpc("qa_attach_tags", {
      _question_id: q.id,
      _labels: [`event:${ev.slug}`],
    });

    return { id: q.id };
  });

export const listEventQuestions = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ eventId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("qa_questions")
      .select("id,title,body_md,vote_score,created_at,answered_on_stage_at,is_anonymous,user_id")
      .eq("event_id", data.eventId)
      .eq("is_deleted", false)
      .order("answered_on_stage_at", { ascending: true, nullsFirst: true })
      .order("vote_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,display_name,avatar_url").in("id", ids)
      : { data: [] as Array<{ id: string; display_name: string | null; avatar_url: string | null }> };
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({
      ...r,
      author: r.is_anonymous ? null : pmap.get(r.user_id) ?? null,
    }));
  });

export const markQuestionAnsweredOnStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ questionId: z.string().uuid(), answered: z.boolean().default(true) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    await supabaseAdmin
      .from("qa_questions")
      .update({ answered_on_stage_at: data.answered ? new Date().toISOString() : null })
      .eq("id", data.questionId);
    return { ok: true };
  });
