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

export const getUserDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(
      data.userId,
    );
    if (authErr) throw new Error(authErr.message);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.userId)
      .maybeSingle();
    const { data: rolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    return {
      id: authUser.user?.id,
      email: authUser.user?.email ?? null,
      emailConfirmedAt: authUser.user?.email_confirmed_at ?? null,
      lastSignInAt: authUser.user?.last_sign_in_at ?? null,
      createdAt: authUser.user?.created_at ?? null,
      profile: profile ?? null,
      roles: (rolesData ?? []).map((r) => r.role as Role),
    };
  });

export const updateUserEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), email: z.string().email().max(255) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generatePasswordResetLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ userId: z.string().uuid(), redirectTo: z.string().url().max(500) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (uErr || !u.user?.email) throw new Error("User has no email");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: u.user.email,
      options: { redirectTo: data.redirectTo },
    });
    if (error) throw new Error(error.message);
    return { actionLink: link.properties?.action_link ?? null, email: u.user.email };
  });
