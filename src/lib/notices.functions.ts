import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.includes("admin") && !roles.includes("moderator")) {
    throw new Error("Forbidden");
  }
}

// -------------------- Public reads --------------------

export const listNotices = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      limit: z.number().min(1).max(50).default(20),
    }).parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("notices")
      .select("*")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getNotice = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("notices")
      .select("*")
      .eq("id", data.id)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// -------------------- Auth: unread + mark read --------------------

export const listUnreadNotices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: notices } = await supabaseAdmin
      .from("notices")
      .select("id, title_en, title_bn, priority, is_pinned, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(20);
    const all = notices ?? [];
    if (!all.length) return [];
    const { data: reads } = await supabaseAdmin
      .from("notice_reads")
      .select("notice_id")
      .eq("user_id", context.userId)
      .in("notice_id", all.map((n) => n.id));
    const readSet = new Set((reads ?? []).map((r) => r.notice_id as string));
    return all.filter((n) => !readSet.has(n.id));
  });

export const markNoticeRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await supabaseAdmin
      .from("notice_reads")
      .upsert({ user_id: context.userId, notice_id: data.id }, { onConflict: "user_id,notice_id" });
    return { ok: true };
  });

export const markAllNoticesRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: notices } = await supabaseAdmin
      .from("notices")
      .select("id")
      .eq("is_published", true);
    const rows = (notices ?? []).map((n) => ({ user_id: context.userId, notice_id: n.id as string }));
    if (rows.length) {
      await supabaseAdmin.from("notice_reads").upsert(rows, { onConflict: "user_id,notice_id" });
    }
    return { ok: true };
  });

// -------------------- Admin --------------------

export const adminListNotices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { data, error } = await supabaseAdmin
      .from("notices")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const NoticeInput = z.object({
  id: z.string().uuid().optional(),
  title_en: z.string().min(1).max(200),
  title_bn: z.string().max(200).default(""),
  body_md_en: z.string().max(20000).default(""),
  body_md_bn: z.string().max(20000).default(""),
  cover_image_url: z.string().url().max(1000).nullable().optional(),
  priority: z.enum(["normal", "important", "urgent"]).default("normal"),
  is_pinned: z.boolean().default(false),
  is_published: z.boolean().default(true),
});

export const adminUpsertNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => NoticeInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { id, ...rest } = data;
    let published_at: string | null | undefined;
    if (id) {
      const { data: existing } = await supabaseAdmin
        .from("notices").select("published_at, is_published").eq("id", id).maybeSingle();
      if (data.is_published && !existing?.published_at) published_at = new Date().toISOString();
      else if (!data.is_published) published_at = null;
    } else if (data.is_published) {
      published_at = new Date().toISOString();
    }
    const payload: any = { ...rest };
    if (published_at !== undefined) payload.published_at = published_at;
    if (!id) payload.created_by = context.userId;

    const q = id
      ? supabaseAdmin.from("notices").update(payload).eq("id", id).select().single()
      : supabaseAdmin.from("notices").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("notices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
