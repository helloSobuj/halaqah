import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TabSchema = z.enum(["new", "unanswered", "trending", "top"]);

// ---------------- READS (public) ----------------

export const listQACategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("qa_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listQuestions = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        tab: TabSchema.default("new"),
        categorySlug: z.string().max(60).optional(),
        tagSlug: z.string().max(60).optional(),
        q: z.string().max(120).optional(),
        limit: z.number().min(1).max(50).default(20),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    let categoryId: string | null = null;
    if (data.categorySlug) {
      const { data: c } = await supabaseAdmin
        .from("qa_categories").select("id").eq("slug", data.categorySlug).maybeSingle();
      categoryId = c?.id ?? null;
    }

    let query = supabaseAdmin
      .from("qa_questions")
      .select(
        "id,title,body_md,language,is_anonymous,status,view_count,answer_count,vote_score,accepted_answer_id,created_at,last_activity_at,user_id,category_id",
      )
      .eq("is_deleted", false)
      .limit(data.limit);

    if (categoryId) query = query.eq("category_id", categoryId);
    if (data.q && data.q.trim().length > 1) query = query.ilike("title", `%${data.q.trim()}%`);

    if (data.tab === "unanswered") query = query.eq("answer_count", 0).order("created_at", { ascending: false });
    else if (data.tab === "trending")
      query = query.gte("last_activity_at", new Date(Date.now() - 7 * 86400_000).toISOString())
        .order("vote_score", { ascending: false }).order("answer_count", { ascending: false });
    else if (data.tab === "top")
      query = query.order("vote_score", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];

    // Fetch authors + tags + categories in batch
    const userIds = Array.from(new Set(list.filter((r) => !r.is_anonymous).map((r) => r.user_id)));
    const qIds = list.map((r) => r.id);
    const catIds = Array.from(new Set(list.map((r) => r.category_id).filter(Boolean) as string[]));

    const [{ data: profiles }, { data: tagLinks }, { data: cats }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("id,display_name,avatar_url,qa_reputation").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      qIds.length
        ? supabaseAdmin.from("qa_question_tags").select("question_id,qa_tags(id,slug,label)").in("question_id", qIds)
        : Promise.resolve({ data: [] as any[] }),
      catIds.length
        ? supabaseAdmin.from("qa_categories").select("id,slug,name_en,name_bn,color,icon").in("id", catIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const catMap = new Map((cats ?? []).map((c) => [c.id, c]));
    const tagMap = new Map<string, Array<{ slug: string; label: string }>>();
    for (const t of tagLinks ?? []) {
      const arr = tagMap.get(t.question_id) ?? [];
      const tag = (t as any).qa_tags;
      if (tag) arr.push({ slug: tag.slug, label: tag.label });
      tagMap.set(t.question_id, arr);
    }

    if (data.tagSlug) {
      const filtered = list.filter((r) =>
        (tagMap.get(r.id) ?? []).some((t) => t.slug === data.tagSlug),
      );
      return filtered.map((r) => decorate(r, profileMap, catMap, tagMap));
    }

    return list.map((r) => decorate(r, profileMap, catMap, tagMap));
  });

function decorate(r: any, profiles: Map<string, any>, cats: Map<string, any>, tags: Map<string, any[]>) {
  const author = r.is_anonymous ? null : profiles.get(r.user_id) ?? null;
  return {
    id: r.id,
    title: r.title,
    excerpt: (r.body_md as string).slice(0, 240),
    language: r.language,
    isAnonymous: r.is_anonymous,
    status: r.status,
    viewCount: r.view_count,
    answerCount: r.answer_count,
    voteScore: r.vote_score,
    accepted: !!r.accepted_answer_id,
    createdAt: r.created_at,
    lastActivityAt: r.last_activity_at,
    author: author ? { id: author.id, name: author.display_name, avatar: author.avatar_url, rep: author.qa_reputation } : null,
    category: r.category_id ? cats.get(r.category_id) ?? null : null,
    tags: tags.get(r.id) ?? [],
  };
}

export const getQuestion = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: q, error } = await supabaseAdmin
      .from("qa_questions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!q || q.is_deleted) throw new Error("Not found");

    await supabaseAdmin.rpc("qa_bump_view", { _question_id: data.id });

    const [{ data: answers }, { data: tagLinks }, { data: comments }, { data: cat }] = await Promise.all([
      supabaseAdmin.from("qa_answers").select("*").eq("question_id", data.id).eq("is_deleted", false)
        .order("is_accepted", { ascending: false })
        .order("is_scholar_endorsed", { ascending: false })
        .order("vote_score", { ascending: false }),
      supabaseAdmin.from("qa_question_tags").select("qa_tags(slug,label)").eq("question_id", data.id),
      supabaseAdmin.from("qa_comments").select("*").or(`and(parent_type.eq.question,parent_id.eq.${data.id})`)
        .order("created_at", { ascending: true }),
      q.category_id
        ? supabaseAdmin.from("qa_categories").select("id,slug,name_en,name_bn,color,icon").eq("id", q.category_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const answerIds = (answers ?? []).map((a) => a.id);
    const allUserIds = Array.from(new Set([
      q.is_anonymous ? null : q.user_id,
      ...((answers ?? []).map((a) => a.user_id)),
      ...((comments ?? []).map((c) => c.user_id)),
    ].filter(Boolean) as string[]));

    const [{ data: aComments }, { data: profiles }] = await Promise.all([
      answerIds.length
        ? supabaseAdmin.from("qa_comments").select("*").eq("parent_type", "answer").in("parent_id", answerIds).order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
      allUserIds.length
        ? supabaseAdmin.from("profiles").select("id,display_name,avatar_url,qa_reputation").in("id", allUserIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    // Scholar role lookup
    const { data: roles } = allUserIds.length
      ? await supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", allUserIds)
      : { data: [] as any[] };
    const scholarSet = new Set(
      (roles ?? []).filter((r) => r.role === "scholar" || r.role === "admin").map((r) => r.user_id),
    );

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const enrichUser = (uid: string) => {
      const p = profileMap.get(uid);
      return p
        ? { id: p.id, name: p.display_name, avatar: p.avatar_url, rep: p.qa_reputation, isScholar: scholarSet.has(uid) }
        : null;
    };

    return {
      question: {
        id: q.id,
        title: q.title,
        body: q.body_md,
        language: q.language,
        isAnonymous: q.is_anonymous,
        status: q.status,
        viewCount: q.view_count,
        answerCount: q.answer_count,
        voteScore: q.vote_score,
        acceptedAnswerId: q.accepted_answer_id,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        author: q.is_anonymous ? null : enrichUser(q.user_id),
        ownerId: q.user_id,
        category: cat ?? null,
        tags: ((tagLinks ?? []) as any[]).map((t) => t.qa_tags).filter(Boolean),
        comments: (comments ?? []).map((c) => ({
          id: c.id, body: c.body, createdAt: c.created_at, author: enrichUser(c.user_id), ownerId: c.user_id,
        })),
      },
      answers: (answers ?? []).map((a) => ({
        id: a.id,
        body: a.body_md,
        voteScore: a.vote_score,
        isAccepted: a.is_accepted,
        isScholarEndorsed: a.is_scholar_endorsed,
        endorsedAt: a.endorsed_at,
        citations: a.citations,
        createdAt: a.created_at,
        author: enrichUser(a.user_id),
        ownerId: a.user_id,
        comments: (aComments ?? []).filter((c) => c.parent_id === a.id).map((c) => ({
          id: c.id, body: c.body, createdAt: c.created_at, author: enrichUser(c.user_id), ownerId: c.user_id,
        })),
      })),
    };
  });

export const myVotesForQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ questionId: z.string().uuid(), answerIds: z.array(z.string().uuid()) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const ids = [data.questionId, ...data.answerIds];
    if (!ids.length) return {};
    const { data: votes } = await supabase
      .from("qa_votes")
      .select("target_type,target_id,value")
      .in("target_id", ids);
    const map: Record<string, number> = {};
    (votes ?? []).forEach((v) => { map[`${v.target_type}:${v.target_id}`] = v.value; });
    return map;
  });

// ---------------- WRITES ----------------

const TitleSchema = z.string().min(10).max(200);
const BodySchema = z.string().min(20).max(20000);
const TagsSchema = z.array(z.string().min(2).max(30)).max(5);

export const createQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        title: TitleSchema,
        body: BodySchema,
        categoryId: z.string().uuid().nullable().optional(),
        language: z.enum(["en", "bn", "both"]).default("en"),
        tags: TagsSchema.default([]),
        isAnonymous: z.boolean().default(false),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: q, error } = await supabase
      .from("qa_questions")
      .insert({
        user_id: userId,
        title: data.title.trim(),
        body_md: data.body,
        category_id: data.categoryId ?? null,
        language: data.language,
        is_anonymous: data.isAnonymous,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.tags.length) {
      await supabaseAdmin.rpc("qa_attach_tags", { _question_id: q.id, _labels: data.tags });
    }
    return { id: q.id };
  });

export const updateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid(),
      title: TitleSchema,
      body: BodySchema,
      categoryId: z.string().uuid().nullable().optional(),
      language: z.enum(["en", "bn", "both"]),
      tags: TagsSchema.default([]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("qa_questions")
      .update({
        title: data.title.trim(),
        body_md: data.body,
        category_id: data.categoryId ?? null,
        language: data.language,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("qa_question_tags").delete().eq("question_id", data.id);
    if (data.tags.length) {
      await supabaseAdmin.rpc("qa_attach_tags", { _question_id: data.id, _labels: data.tags });
    }
    return { ok: true };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("qa_questions").update({ is_deleted: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      questionId: z.string().uuid(),
      body: BodySchema,
      citations: z.array(z.object({
        type: z.enum(["quran", "hadith", "url"]),
        ref: z.string().min(1).max(200),
        text: z.string().max(500).optional(),
      })).max(10).default([]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: a, error } = await supabase
      .from("qa_answers")
      .insert({
        question_id: data.questionId,
        user_id: userId,
        body_md: data.body,
        citations: data.citations,
      })
      .select("id")
      .single();
    if (error) {
      if (error.message.includes("duplicate")) throw new Error("You already answered this question — edit your answer instead.");
      throw new Error(error.message);
    }
    return { id: a.id };
  });

export const updateAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid(),
      body: BodySchema,
      citations: z.array(z.any()).max(10).default([]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("qa_answers")
      .update({ body_md: data.body, citations: data.citations })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("qa_answers").update({ is_deleted: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      parentType: z.enum(["question", "answer"]),
      parentId: z.string().uuid(),
      body: z.string().min(2).max(600),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("qa_comments").insert({
      parent_type: data.parentType,
      parent_id: data.parentId,
      user_id: userId,
      body: data.body.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("qa_comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const castVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      targetType: z.enum(["question", "answer"]),
      targetId: z.string().uuid(),
      value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("qa_cast_vote", {
      _target_type: data.targetType,
      _target_id: data.targetId,
      _value: data.value,
    });
    if (error) throw new Error(error.message);
    return result as { score: number; my_value: number | null };
  });

export const acceptAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ answerId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("qa_accept_answer", { _answer_id: data.answerId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const endorseAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ answerId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("qa_endorse_answer", { _answer_id: data.answerId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getQALeaderboard = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ period: z.enum(["week", "month", "all"]).default("week") }).parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin.rpc("qa_leaderboard", { _period: data.period });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getDailyQuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await context.supabase
      .from("qa_daily_quests")
      .select("*")
      .eq("date", today)
      .maybeSingle();
    return {
      date: today,
      answered: data?.answered ?? 0,
      upvoted: data?.upvoted ?? 0,
      asked: data?.asked ?? 0,
      goals: { answer: 1, upvote: 3, ask: 1 },
    };
  });

export const listMyQA = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [{ data: questions }, { data: answers }, { data: profile }, { data: rep }] = await Promise.all([
      supabaseAdmin.from("qa_questions")
        .select("id,title,vote_score,answer_count,created_at,accepted_answer_id")
        .eq("user_id", userId).eq("is_deleted", false)
        .order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("qa_answers")
        .select("id,question_id,vote_score,is_accepted,is_scholar_endorsed,created_at,qa_questions!inner(title)")
        .eq("user_id", userId).eq("is_deleted", false)
        .order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("profiles").select("qa_reputation,qa_answer_streak").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("qa_reputation_events").select("delta,reason,created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);
    return {
      reputation: profile?.qa_reputation ?? 0,
      answerStreak: profile?.qa_answer_streak ?? 0,
      questions: questions ?? [],
      answers: (answers ?? []).map((a: any) => ({
        ...a,
        question_title: a.qa_questions?.title,
      })),
      recentRep: rep ?? [],
    };
  });

// ---------------- ADMIN / MOD ----------------

async function assertStaff(supabase: any, userId: string, includeScholar = false) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  const allowed = roles.includes("admin") || roles.includes("moderator") || (includeScholar && roles.includes("scholar"));
  if (!allowed) throw new Error("Forbidden");
}

export const listFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: flags, error } = await supabaseAdmin
      .from("qa_flags").select("*").eq("status", "open")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    const list = flags ?? [];
    const reporterIds = Array.from(new Set(list.map((f) => f.user_id)));
    const qIds = list.filter((f) => f.target_type === "question").map((f) => f.target_id);
    const aIds = list.filter((f) => f.target_type === "answer").map((f) => f.target_id);
    const [{ data: profiles }, { data: questions }, { data: answers }] = await Promise.all([
      reporterIds.length ? supabaseAdmin.from("profiles").select("id,display_name").in("id", reporterIds) : Promise.resolve({ data: [] as any[] }),
      qIds.length ? supabaseAdmin.from("qa_questions").select("id,title,body_md,user_id").in("id", qIds) : Promise.resolve({ data: [] as any[] }),
      aIds.length ? supabaseAdmin.from("qa_answers").select("id,body_md,user_id,question_id").in("id", aIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
    const qMap = new Map((questions ?? []).map((q: any) => [q.id, q]));
    const aMap = new Map((answers ?? []).map((a: any) => [a.id, a]));
    return list.map((f) => ({
      id: f.id,
      reason: f.reason,
      createdAt: f.created_at,
      reporter: pMap.get(f.user_id) ?? "Unknown",
      target_type: f.target_type,
      target_id: f.target_id,
      preview: f.target_type === "question"
        ? { title: qMap.get(f.target_id)?.title, body: qMap.get(f.target_id)?.body_md?.slice(0, 240) }
        : { body: aMap.get(f.target_id)?.body_md?.slice(0, 240), questionId: aMap.get(f.target_id)?.question_id },
    }));
  });

export const resolveFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    flagId: z.string().uuid(),
    action: z.enum(["dismiss", "delete_target", "lock_question"]),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: f, error } = await supabaseAdmin.from("qa_flags").select("*").eq("id", data.flagId).maybeSingle();
    if (error || !f) throw new Error("Flag not found");
    if (data.action === "delete_target") {
      if (f.target_type === "question") {
        await supabaseAdmin.from("qa_questions").update({ is_deleted: true }).eq("id", f.target_id);
      } else {
        await supabaseAdmin.from("qa_answers").update({ is_deleted: true }).eq("id", f.target_id);
      }
    } else if (data.action === "lock_question") {
      const qid = f.target_type === "question"
        ? f.target_id
        : (await supabaseAdmin.from("qa_answers").select("question_id").eq("id", f.target_id).maybeSingle()).data?.question_id;
      if (qid) await supabaseAdmin.from("qa_questions").update({ is_locked: true }).eq("id", qid);
    }
    await supabaseAdmin.from("qa_flags").update({ status: "resolved" }).eq("id", data.flagId);
    return { ok: true };
  });

export const adminListQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    q: z.string().max(120).optional(),
    filter: z.enum(["all", "deleted", "locked", "needs_review"]).default("all"),
    limit: z.number().min(1).max(100).default(50),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    let query = supabaseAdmin.from("qa_questions")
      .select("id,title,user_id,is_deleted,is_locked,scholar_review_required,answer_count,vote_score,created_at")
      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.filter === "deleted") query = query.eq("is_deleted", true);
    else if (data.filter === "locked") query = query.eq("is_locked", true);
    else if (data.filter === "needs_review") query = query.eq("scholar_review_required", true);
    if (data.q && data.q.trim().length > 1) query = query.ilike("title", `%${data.q.trim()}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id,display_name").in("id", userIds)
      : { data: [] as any[] };
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
    return list.map((r) => ({ ...r, author: pMap.get(r.user_id) ?? "Unknown" }));
  });

export const adminToggleLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), locked: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("qa_questions").update({ is_locked: data.locked }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), deleted: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("qa_questions").update({ is_deleted: data.deleted }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const claimDailyBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("qa_claim_daily_bonus");
    if (error) throw new Error(error.message);
    return data as { rep_awarded: number };
  });

export const getMyBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("qa_badges").select("code,awarded_at,meta")
      .eq("user_id", context.userId).order("awarded_at", { ascending: false });
    return data ?? [];
  });
