import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LangSchema = z.enum(["ar", "en", "bn", "ur", "other"]);
const SourceSchema = z.enum(["pdf", "external"]);
const StatusSchema = z.enum(["pending", "approved", "rejected"]);
const SortSchema = z.enum(["newest", "downloads", "rating"]).default("newest");

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.includes("admin") && !roles.includes("moderator")) {
    throw new Error("Forbidden");
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "book";
  let slug = root;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabaseAdmin
      .from("library_books")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    i += 1;
    slug = `${root}-${i}`;
  }
}

// ------------------- Public reads -------------------

export const listLibraryCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("library_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listBooks = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        q: z.string().max(120).optional(),
        categorySlug: z.string().max(60).optional(),
        language: LangSchema.optional(),
        sourceType: SourceSchema.optional(),
        sort: SortSchema,
        featured: z.boolean().optional(),
        limit: z.number().min(1).max(60).default(30),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    let categoryId: string | null = null;
    if (data.categorySlug) {
      const { data: c } = await supabaseAdmin
        .from("library_categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      categoryId = c?.id ?? null;
    }

    let query = supabaseAdmin
      .from("library_books")
      .select("*, category:library_categories(id, slug, name_en, name_bn, color)")
      .eq("status", "approved")
      .limit(data.limit);

    if (categoryId) query = query.eq("category_id", categoryId);
    if (data.language) query = query.eq("language", data.language);
    if (data.sourceType) query = query.eq("source_type", data.sourceType);
    if (data.featured) query = query.eq("is_featured", true);
    if (data.q) {
      const term = `%${data.q}%`;
      query = query.or(`title.ilike.${term},author.ilike.${term},description.ilike.${term}`);
    }
    if (data.sort === "downloads") {
      query = query.order("download_count", { ascending: false });
    } else if (data.sort === "rating") {
      query = query.order("avg_rating", { ascending: false }).order("rating_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getBookBySlug = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data }) => {
    const { data: book, error } = await supabaseAdmin
      .from("library_books")
      .select("*, category:library_categories(id, slug, name_en, name_bn, color)")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!book) return null;
    if (book.status !== "approved") {
      // still return for owner/staff; UI will gate further
    }
    await supabaseAdmin.rpc("bump_library_view", { _book_id: book.id });
    return book;
  });

export const listBookComments = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ bookId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("library_comments")
      .select("*")
      .eq("book_id", data.bookId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    let profilesById: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      profilesById = Object.fromEntries(
        (profs ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }
    return (rows ?? []).map((r) => ({ ...r, profile: profilesById[r.user_id] ?? null }));
  });

// ------------------- Authed user actions -------------------

export const getMyBookState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ bookId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const [bookmark, rating] = await Promise.all([
      supabaseAdmin
        .from("library_bookmarks")
        .select("book_id")
        .eq("book_id", data.bookId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("library_ratings")
        .select("value")
        .eq("book_id", data.bookId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    return {
      bookmarked: !!bookmark.data,
      myRating: rating.data?.value ?? null,
    };
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ bookId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin
      .from("library_bookmarks")
      .select("book_id")
      .eq("book_id", data.bookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin
        .from("library_bookmarks")
        .delete()
        .eq("book_id", data.bookId)
        .eq("user_id", userId);
      return { bookmarked: false };
    }
    await supabaseAdmin
      .from("library_bookmarks")
      .insert({ book_id: data.bookId, user_id: userId });
    return { bookmarked: true };
  });

export const setMyRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ bookId: z.string().uuid(), value: z.number().int().min(1).max(5) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("library_ratings")
      .upsert({ book_id: data.bookId, user_id: userId, value: data.value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearMyRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ bookId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await supabaseAdmin
      .from("library_ratings")
      .delete()
      .eq("book_id", data.bookId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        bookId: z.string().uuid(),
        body_md: z.string().min(1).max(5000),
        parent_id: z.string().uuid().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await supabaseAdmin
      .from("library_comments")
      .insert({
        book_id: data.bookId,
        user_id: context.userId,
        body_md: data.body_md,
        parent_id: data.parent_id ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ commentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: c } = await supabaseAdmin
      .from("library_comments")
      .select("user_id")
      .eq("id", data.commentId)
      .maybeSingle();
    if (!c) throw new Error("Not found");
    const isOwner = c.user_id === context.userId;
    let isStaff = false;
    if (!isOwner) {
      try {
        await assertStaff(context.userId);
        isStaff = true;
      } catch {
        isStaff = false;
      }
    }
    if (!isOwner && !isStaff) throw new Error("Forbidden");
    await supabaseAdmin
      .from("library_comments")
      .update({ is_deleted: true })
      .eq("id", data.commentId);
    return { ok: true };
  });

export const recordDownload = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ bookId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("library_downloads").insert({ book_id: data.bookId });
    await supabaseAdmin.rpc("bump_library_download", { _book_id: data.bookId });
    return { ok: true };
  });

// ------------------- Submissions -------------------

const BookInputSchema = z.object({
  title: z.string().min(1).max(255),
  author: z.string().max(255).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  language: LangSchema.default("en"),
  category_id: z.string().uuid().nullable().optional(),
  cover_image_url: z.string().url().max(1024).nullable().optional(),
  published_year: z.number().int().min(0).max(3000).nullable().optional(),
  pages: z.number().int().min(0).max(100000).nullable().optional(),
  source_type: SourceSchema,
  pdf_path: z.string().max(1024).nullable().optional(),
  pdf_size_bytes: z.number().int().min(0).nullable().optional(),
  external_url: z.string().url().max(2048).nullable().optional(),
});

export const submitBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => BookInputSchema.parse(i))
  .handler(async ({ data, context }) => {
    if (data.source_type === "pdf" && !data.pdf_path) throw new Error("PDF file required");
    if (data.source_type === "external" && !data.external_url) throw new Error("External URL required");
    const slug = await uniqueSlug(data.title);
    const { data: row, error } = await supabaseAdmin
      .from("library_books")
      .insert({
        ...data,
        slug,
        status: "pending",
        submitted_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const myBookSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("library_books")
      .select("*, category:library_categories(name_en, name_bn)")
      .eq("submitted_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyBookSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await supabaseAdmin
      .from("library_books")
      .select("*")
      .eq("id", data.id)
      .eq("submitted_by", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const updateMyBookSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => BookInputSchema.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (rest.source_type === "pdf" && !rest.pdf_path) throw new Error("PDF file required");
    if (rest.source_type === "external" && !rest.external_url) throw new Error("External URL required");
    const { data: existing } = await supabaseAdmin
      .from("library_books")
      .select("submitted_by, status")
      .eq("id", id)
      .maybeSingle();
    if (!existing || existing.submitted_by !== context.userId) throw new Error("Forbidden");
    if (existing.status === "approved") throw new Error("Approved books can't be edited");
    const { data: row, error } = await supabaseAdmin
      .from("library_books")
      .update({ ...rest, status: "pending", rejection_reason: null })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const myBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("library_bookmarks")
      .select("book:library_books(*, category:library_categories(name_en, name_bn))")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.book).filter(Boolean);
  });

// ------------------- Admin -------------------

export const adminListBooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ status: StatusSchema.optional(), q: z.string().max(120).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    let q = supabaseAdmin
      .from("library_books")
      .select("*, category:library_categories(name_en, name_bn)")
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.q) {
      const t = `%${data.q}%`;
      q = q.or(`title.ilike.${t},author.ilike.${t}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpsertBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    BookInputSchema.extend({
      id: z.string().uuid().optional(),
      slug: z.string().max(120).optional(),
      status: StatusSchema.optional(),
      is_featured: z.boolean().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await supabaseAdmin
        .from("library_books")
        .update(rest)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const slug = data.slug ? slugify(data.slug) : await uniqueSlug(data.title);
    const { data: row, error } = await supabaseAdmin
      .from("library_books")
      .insert({
        ...data,
        slug,
        status: data.status ?? "approved",
        submitted_by: context.userId,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("library_books").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminReviewBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
        reason: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("library_books")
      .update({
        status: data.decision === "approve" ? "approved" : "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: data.decision === "reject" ? (data.reason ?? null) : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertLibraryCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid().optional(),
        slug: z.string().min(1).max(60),
        name_en: z.string().min(1).max(120),
        name_bn: z.string().min(1).max(120),
        color: z.string().max(20).optional(),
        icon: z.string().max(60).optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("library_categories")
      .upsert(data, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteLibraryCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("library_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
