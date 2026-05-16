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

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function uniqueSlug(table: "blog_posts" | "blog_categories" | "blog_tags", base: string, ignoreId?: string) {
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

function readingMinutes(md: string) {
  const text = (md || "").replace(/<[^>]*>/g, " ").replace(/[#*_>`\-\[\]\(\)!]/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// -------------------- Public reads --------------------

export const listBlogCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("blog_categories").select("*").order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listBlogTags = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ limit: z.number().min(1).max(100).default(50) }).parse(i ?? {}))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("blog_tags").select("*").order("usage_count", { ascending: false }).limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPosts = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      categorySlug: z.string().max(80).optional(),
      tagSlug: z.string().max(80).optional(),
      q: z.string().max(120).optional(),
      featured: z.boolean().optional(),
      sortBy: z.enum(["recent", "popular"]).default("recent"),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(50).default(12),
    }).parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    let categoryId: string | null = null;
    if (data.categorySlug) {
      const { data: c } = await supabaseAdmin
        .from("blog_categories").select("id").eq("slug", data.categorySlug).maybeSingle();
      categoryId = c?.id ?? null;
      if (!categoryId) return { posts: [], total: 0 };
    }
    let postIdsFromTag: string[] | null = null;
    if (data.tagSlug) {
      const { data: t } = await supabaseAdmin
        .from("blog_tags").select("id").eq("slug", data.tagSlug).maybeSingle();
      if (!t) return { posts: [], total: 0 };
      const { data: rows } = await supabaseAdmin
        .from("blog_post_tags").select("post_id").eq("tag_id", t.id);
      postIdsFromTag = (rows ?? []).map((r) => r.post_id as string);
      if (!postIdsFromTag.length) return { posts: [], total: 0 };
    }

    let q = supabaseAdmin
      .from("blog_posts")
      .select("*, category:blog_categories(name_en, name_bn, slug, color)", { count: "exact" })
      .eq("is_published", true);
    if (categoryId) q = q.eq("category_id", categoryId);
    if (data.featured) q = q.eq("is_featured", true);
    if (postIdsFromTag) q = q.in("id", postIdsFromTag);
    if (data.q) q = q.ilike("title_en", `%${data.q}%`);

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    if (data.sortBy === "popular") {
      q = q.order("view_count", { ascending: false })
           .order("like_count", { ascending: false });
    } else {
      q = q.order("published_at", { ascending: false, nullsFirst: false })
           .order("created_at", { ascending: false });
    }
    const { data: rows, error, count } = await q.range(from, to);
    if (error) throw new Error(error.message);
    return { posts: rows ?? [], total: count ?? 0 };
  });

export const getPost = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(80) }).parse(i))
  .handler(async ({ data }) => {
    const { data: post, error } = await supabaseAdmin
      .from("blog_posts")
      .select("*, category:blog_categories(name_en, name_bn, slug, color)")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) return null;

    const [{ data: tagRows }, { data: author }, { data: suggested }] = await Promise.all([
      supabaseAdmin.from("blog_post_tags").select("tag:blog_tags(id, slug, label_en, label_bn)").eq("post_id", post.id),
      post.author_id
        ? supabaseAdmin.from("profiles").select("id, display_name, avatar_url").eq("id", post.author_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("blog_posts")
        .select("id, slug, title_en, title_bn, excerpt_en, cover_image_url, reading_minutes, published_at, audio_url, category:blog_categories(name_en, slug, color)")
        .eq("is_published", true)
        .neq("id", post.id)
        .eq(post.category_id ? "category_id" : "is_published", post.category_id ?? true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(4),
    ]);

    return {
      post,
      tags: (tagRows ?? []).map((r: any) => r.tag).filter(Boolean),
      author: author ?? null,
      suggested: suggested ?? [],
    };
  });

export const listBlogComments = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ postId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("blog_comments")
      .select("*, author:profiles(id, display_name, avatar_url)")
      .eq("post_id", data.postId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const bumpBlogView = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await supabaseAdmin.rpc("bump_blog_view", { _post_id: data.id });
    return { ok: true };
  });

// -------------------- Auth actions --------------------

export const addBlogComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      postId: z.string().uuid(),
      body: z.string().min(1).max(4000),
      parentId: z.string().uuid().nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await supabaseAdmin
      .from("blog_comments")
      .insert({
        post_id: data.postId,
        user_id: context.userId,
        parent_id: data.parentId ?? null,
        body_md: data.body,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBlogComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row } = await supabaseAdmin.from("blog_comments").select("user_id").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Not found");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    const isStaff = (roles ?? []).some((r) => r.role === "admin" || r.role === "moderator");
    if (row.user_id !== context.userId && !isStaff) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("blog_comments").update({ is_deleted: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleBlogLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ postId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await supabaseAdmin
      .from("blog_likes").select("post_id").eq("post_id", data.postId).eq("user_id", context.userId).maybeSingle();
    if (existing) {
      await supabaseAdmin.from("blog_likes").delete().eq("post_id", data.postId).eq("user_id", context.userId);
      return { liked: false };
    }
    await supabaseAdmin.from("blog_likes").insert({ post_id: data.postId, user_id: context.userId });
    return { liked: true };
  });

export const getBlogLikeState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ postId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row } = await supabaseAdmin
      .from("blog_likes").select("post_id").eq("post_id", data.postId).eq("user_id", context.userId).maybeSingle();
    return { liked: !!row };
  });

// -------------------- Admin --------------------

export const adminListPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ q: z.string().max(120).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    let q = supabaseAdmin
      .from("blog_posts")
      .select("*, category:blog_categories(name_en)");
    if (data.q) q = q.ilike("title_en", `%${data.q}%`);
    const { data: rows, error } = await q.order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const PostInput = z.object({
  id: z.string().uuid().optional(),
  title_en: z.string().min(1).max(200),
  title_bn: z.string().max(200).default(""),
  excerpt_en: z.string().max(500).nullable().optional(),
  excerpt_bn: z.string().max(500).nullable().optional(),
  content_md_en: z.string().max(50000).default(""),
  content_md_bn: z.string().max(50000).default(""),
  cover_image_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  audio_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  audio_duration_seconds: z.number().int().min(0).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  language: z.string().max(10).default("en"),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  tagIds: z.array(z.string().uuid()).default([]),
});

export const adminUpsertPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => PostInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const slug = await uniqueSlug("blog_posts", data.title_en, data.id);
    const reading_minutes = readingMinutes(`${data.content_md_en}\n${data.content_md_bn}`);

    let published_at: string | null | undefined;
    if (data.id) {
      const { data: existing } = await supabaseAdmin
        .from("blog_posts").select("published_at, is_published").eq("id", data.id).maybeSingle();
      if (data.is_published && !existing?.published_at) published_at = new Date().toISOString();
      else if (!data.is_published) published_at = existing?.published_at ?? null;
    } else if (data.is_published) {
      published_at = new Date().toISOString();
    }

    const { tagIds, ...rest } = data;
    const payload: any = { ...rest, slug, reading_minutes };
    if (published_at !== undefined) payload.published_at = published_at;
    if (!data.id) payload.author_id = context.userId;

    const q = data.id
      ? supabaseAdmin.from("blog_posts").update(payload).eq("id", data.id).select().single()
      : supabaseAdmin.from("blog_posts").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);

    // Replace tags
    await supabaseAdmin.from("blog_post_tags").delete().eq("post_id", row.id);
    if (tagIds.length) {
      await supabaseAdmin.from("blog_post_tags").insert(tagIds.map((tag_id) => ({ post_id: row.id, tag_id })));
    }
    return row;
  });

export const adminDeletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const [{ data: post }, { data: tagRows }] = await Promise.all([
      supabaseAdmin.from("blog_posts").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("blog_post_tags").select("tag_id").eq("post_id", data.id),
    ]);
    return { post, tagIds: (tagRows ?? []).map((r) => r.tag_id as string) };
  });

export const adminUpsertBlogCategory = createServerFn({ method: "POST" })
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
    const slug = await uniqueSlug("blog_categories", data.slug, data.id);
    const payload = { ...data, slug };
    const q = data.id
      ? supabaseAdmin.from("blog_categories").update(payload).eq("id", data.id).select().single()
      : supabaseAdmin.from("blog_categories").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteBlogCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("blog_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertBlogTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      label_en: z.string().min(1).max(80),
      label_bn: z.string().max(80).default(""),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const slug = await uniqueSlug("blog_tags", data.label_en, data.id);
    const payload = { ...data, slug };
    const q = data.id
      ? supabaseAdmin.from("blog_tags").update(payload).eq("id", data.id).select().single()
      : supabaseAdmin.from("blog_tags").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteBlogTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("blog_tags").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
