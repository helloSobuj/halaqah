import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { extractYouTubeId, youtubeThumbnail } from "@/lib/youtube";

const LangSchema = z.enum(["ar", "en", "bn", "ur", "other"]);

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.includes("admin") && !roles.includes("moderator")) {
    throw new Error("Forbidden");
  }
}

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function uniqueSlug(table: "videos" | "video_playlists" | "video_categories", base: string, ignoreId?: string) {
  const root = slugify(base) || table.slice(0, 5);
  let slug = root;
  let i = 1;
  while (true) {
    const { data } = await supabaseAdmin.from(table).select("id").eq("slug", slug).maybeSingle();
    if (!data || data.id === ignoreId) return slug;
    i += 1;
    slug = `${root}-${i}`;
  }
}

// -------------------- Public reads --------------------

export const listVideoCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("video_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listPlaylists = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      categorySlug: z.string().max(80).optional(),
      featured: z.boolean().optional(),
      limit: z.number().min(1).max(60).default(30),
    }).parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    let categoryId: string | null = null;
    if (data.categorySlug) {
      const { data: c } = await supabaseAdmin
        .from("video_categories").select("id").eq("slug", data.categorySlug).maybeSingle();
      categoryId = c?.id ?? null;
      if (!categoryId) return [];
    }
    let q = supabaseAdmin
      .from("video_playlists")
      .select("*, category:video_categories(name_en, name_bn, slug)")
      .eq("is_published", true);
    if (categoryId) q = q.eq("category_id", categoryId);
    if (data.featured) q = q.eq("is_featured", true);
    const { data: rows, error } = await q
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPlaylist = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(80) }).parse(i))
  .handler(async ({ data }) => {
    const { data: playlist, error } = await supabaseAdmin
      .from("video_playlists")
      .select("*, category:video_categories(name_en, name_bn, slug)")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!playlist) return null;
    const { data: videos } = await supabaseAdmin
      .from("videos")
      .select("*")
      .eq("playlist_id", playlist.id)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return { playlist, videos: videos ?? [] };
  });

export const listVideos = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      categorySlug: z.string().max(80).optional(),
      q: z.string().max(120).optional(),
      featured: z.boolean().optional(),
      limit: z.number().min(1).max(60).default(24),
    }).parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    let categoryId: string | null = null;
    if (data.categorySlug) {
      const { data: c } = await supabaseAdmin
        .from("video_categories").select("id").eq("slug", data.categorySlug).maybeSingle();
      categoryId = c?.id ?? null;
      if (!categoryId) return [];
    }
    let q = supabaseAdmin
      .from("videos")
      .select("*, category:video_categories(name_en, name_bn, slug), playlist:video_playlists(title_en, slug)")
      .eq("is_published", true);
    if (categoryId) q = q.eq("category_id", categoryId);
    if (data.featured) q = q.eq("is_featured", true);
    if (data.q) q = q.ilike("title_en", `%${data.q}%`);
    const { data: rows, error } = await q
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getVideo = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(80) }).parse(i))
  .handler(async ({ data }) => {
    const { data: video, error } = await supabaseAdmin
      .from("videos")
      .select("*, category:video_categories(name_en, name_bn, slug), playlist:video_playlists(id, title_en, slug)")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!video) return null;
    let siblings: any[] = [];
    if (video.playlist_id) {
      const { data: rows } = await supabaseAdmin
        .from("videos")
        .select("id, slug, title_en, title_bn, thumbnail_url, youtube_video_id, duration_seconds")
        .eq("playlist_id", video.playlist_id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      siblings = rows ?? [];
    }
    return { video, siblings };
  });

export const bumpVideoView = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await supabaseAdmin.rpc("bump_video_view", { _video_id: data.id });
    return { ok: true };
  });

// -------------------- Admin --------------------

export const adminListVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      q: z.string().max(120).optional(),
      categoryId: z.string().uuid().optional(),
      playlistId: z.string().uuid().optional(),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    let q = supabaseAdmin
      .from("videos")
      .select("*, category:video_categories(name_en), playlist:video_playlists(title_en)");
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    if (data.playlistId) q = q.eq("playlist_id", data.playlistId);
    if (data.q) q = q.ilike("title_en", `%${data.q}%`);
    const { data: rows, error } = await q.order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminListPlaylists = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ q: z.string().max(120).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    let q = supabaseAdmin
      .from("video_playlists")
      .select("*, category:video_categories(name_en)");
    if (data.q) q = q.ilike("title_en", `%${data.q}%`);
    const { data: rows, error } = await q.order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpsertVideoCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      slug: z.string().min(1).max(80),
      name_en: z.string().min(1).max(120),
      name_bn: z.string().min(1).max(120),
      color: z.string().max(20).optional(),
      icon: z.string().max(40).optional(),
      sort_order: z.number().int().default(0),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const slug = await uniqueSlug("video_categories", data.slug, data.id);
    const payload = { ...data, slug };
    const q = data.id
      ? supabaseAdmin.from("video_categories").update(payload).eq("id", data.id).select().single()
      : supabaseAdmin.from("video_categories").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteVideoCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("video_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      title_en: z.string().min(1).max(200),
      title_bn: z.string().max(200).default(""),
      description_en: z.string().max(4000).nullable().optional(),
      description_bn: z.string().max(4000).nullable().optional(),
      category_id: z.string().uuid().nullable().optional(),
      cover_image_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
      youtube_playlist_id: z.string().max(80).nullable().optional(),
      is_published: z.boolean().default(false),
      is_featured: z.boolean().default(false),
      sort_order: z.number().int().default(0),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const slug = await uniqueSlug("video_playlists", data.title_en, data.id);
    const payload: any = { ...data, slug };
    if (!data.id) payload.created_by = context.userId;
    const q = data.id
      ? supabaseAdmin.from("video_playlists").update(payload).eq("id", data.id).select().single()
      : supabaseAdmin.from("video_playlists").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeletePlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("video_playlists").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      title_en: z.string().min(1).max(200),
      title_bn: z.string().max(200).default(""),
      description_en: z.string().max(8000).nullable().optional(),
      description_bn: z.string().max(8000).nullable().optional(),
      youtube_url: z.string().min(1).max(500),
      category_id: z.string().uuid().nullable().optional(),
      playlist_id: z.string().uuid().nullable().optional(),
      thumbnail_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
      speaker: z.string().max(120).nullable().optional(),
      language: LangSchema.default("en"),
      duration_seconds: z.number().int().min(0).nullable().optional(),
      is_published: z.boolean().default(true),
      is_featured: z.boolean().default(false),
      sort_order: z.number().int().default(0),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const ytId = extractYouTubeId(data.youtube_url);
    if (!ytId) throw new Error("Could not parse YouTube video ID from the URL");
    const slug = await uniqueSlug("videos", data.title_en, data.id);
    const payload: any = {
      ...data,
      slug,
      youtube_video_id: ytId,
      thumbnail_url: data.thumbnail_url || youtubeThumbnail(ytId, "hq"),
    };
    if (!data.id) payload.created_by = context.userId;
    const q = data.id
      ? supabaseAdmin.from("videos").update(payload).eq("id", data.id).select().single()
      : supabaseAdmin.from("videos").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
