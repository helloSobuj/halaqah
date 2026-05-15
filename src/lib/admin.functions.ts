import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["admin", "moderator", "scholar", "user"] as const;
type Role = (typeof ROLES)[number];

async function assertStaff(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Failed to verify role");
  const roles = (data ?? []).map((r) => r.role as Role);
  const ok = roles.includes("admin") || roles.includes("moderator") || roles.includes("scholar");
  if (!ok) throw new Error("Forbidden");
  return roles;
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Failed to verify role");
  if (!data) throw new Error("Forbidden");
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().max(120).optional(),
        page: z.number().int().min(0).max(1000).optional(),
        pageSize: z.number().int().min(1).max(50).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const page = data.page ?? 0;
    const pageSize = data.pageSize ?? 20;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url, location, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.search && data.search.trim()) {
      q = q.ilike("display_name", `%${data.search.trim()}%`);
    }

    const { data: profiles, error, count } = await q;
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    let rolesByUser: Record<string, Role[]> = {};
    if (ids.length) {
      const { data: rolesData, error: rolesErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      if (rolesErr) throw new Error(rolesErr.message);
      for (const r of rolesData ?? []) {
        const u = r.user_id as string;
        rolesByUser[u] = [...(rolesByUser[u] ?? []), r.role as Role];
      }
    }

    return {
      users: (profiles ?? []).map((p) => ({
        id: p.id,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        location: p.location,
        createdAt: p.created_at,
        roles: rolesByUser[p.id] ?? [],
      })),
      total: count ?? 0,
      page,
      pageSize,
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(ROLES),
        grant: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      // unique violation = already has it; ignore
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
