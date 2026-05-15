import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.some((r) => ["admin", "moderator", "scholar"].includes(r))) throw new Error("Forbidden");
}

const tournamentSchema = z.object({
  id: z.string().uuid().optional(),
  quiz_id: z.string().uuid(),
  name_en: z.string().min(1).max(160),
  name_bn: z.string().min(1).max(160),
  description_en: z.string().max(2000).nullable().optional(),
  description_bn: z.string().max(2000).nullable().optional(),
  bracket_size: z.union([z.literal(4), z.literal(8), z.literal(16), z.literal(32)]),
  registration_opens_at: z.string(),
  registration_closes_at: z.string(),
  starts_at: z.string(),
  round_minutes: z.number().int().min(5).max(720),
  prize_en: z.string().max(300).nullable().optional(),
  prize_bn: z.string().max(300).nullable().optional(),
  status: z.enum(["draft", "open", "in_progress", "finished", "cancelled"]).optional(),
});

export const listTournaments = createServerFn({ method: "POST" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("tournaments")
    .select("*, quizzes(title_en, title_bn, timezone)")
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  // attach participant counts
  const ids = (data ?? []).map((t) => t.id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: parts } = await supabaseAdmin
      .from("tournament_participants")
      .select("tournament_id")
      .in("tournament_id", ids);
    for (const p of parts ?? []) counts[p.tournament_id] = (counts[p.tournament_id] ?? 0) + 1;
  }
  return (data ?? []).map((t) => ({ ...t, participant_count: counts[t.id] ?? 0 }));
});

export const getTournament = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: t, error } = await supabaseAdmin
      .from("tournaments")
      .select("*, quizzes(id, title_en, title_bn, timezone, time_limit_seconds)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) throw new Error("Tournament not found");
    const { data: participants } = await supabaseAdmin
      .from("tournament_participants")
      .select("user_id, status, joined_at, profiles:user_id(display_name, avatar_url)")
      .eq("tournament_id", data.id)
      .order("joined_at", { ascending: true });
    const { data: matches } = await supabaseAdmin
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", data.id)
      .order("round", { ascending: true })
      .order("match_index", { ascending: true });

    // Resolve user display names for matches
    const userIds = new Set<string>();
    for (const m of matches ?? []) {
      if (m.p1_user_id) userIds.add(m.p1_user_id);
      if (m.p2_user_id) userIds.add(m.p2_user_id);
    }
    const profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.size) {
      const { data: pdata } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", Array.from(userIds));
      for (const p of pdata ?? []) profiles[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
    }
    return { tournament: t, participants: participants ?? [], matches: matches ?? [], profiles };
  });

export const upsertTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => tournamentSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const payload = { ...data, created_by: context.userId };
    if (data.id) {
      const { error } = await supabaseAdmin.from("tournaments").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await supabaseAdmin.from("tournaments").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("tournaments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const joinTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tournamentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("status, registration_closes_at, bracket_size")
      .eq("id", data.tournamentId)
      .maybeSingle();
    if (!t) throw new Error("Tournament not found");
    if (t.status !== "open") throw new Error("Registration not open");
    if (new Date(t.registration_closes_at).getTime() < Date.now()) throw new Error("Registration closed");
    const { count } = await supabaseAdmin
      .from("tournament_participants")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", data.tournamentId);
    if ((count ?? 0) >= t.bracket_size) throw new Error("Tournament full");
    const { error } = await supabaseAdmin
      .from("tournament_participants")
      .insert({ tournament_id: data.tournamentId, user_id: context.userId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const leaveTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tournamentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("tournament_participants")
      .delete()
      .eq("tournament_id", data.tournamentId)
      .eq("user_id", context.userId)
      .eq("status", "registered");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startTournamentBracket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tournamentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: result, error } = await context.supabase.rpc("start_tournament", {
      _tournament_id: data.tournamentId,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const submitMatchResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ matchId: z.string().uuid(), attemptId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.rpc("submit_tournament_match", {
      _match_id: data.matchId,
      _attempt_id: data.attemptId,
    });
    if (error) throw new Error(error.message);
    return r;
  });

export const getMyActiveMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tournamentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: m } = await supabaseAdmin
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", data.tournamentId)
      .eq("status", "live")
      .or(`p1_user_id.eq.${context.userId},p2_user_id.eq.${context.userId}`)
      .order("round", { ascending: true })
      .limit(1)
      .maybeSingle();
    return m;
  });
