import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  categorySchema,
  questionSchema,
  questionImportSchema,
  quizSchema,
} from "@/lib/quiz.schemas";

const ROLES = ["admin", "moderator", "scholar", "user"] as const;
type Role = (typeof ROLES)[number];

async function getRoles(userId: string): Promise<Role[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Failed to verify role");
  return (data ?? []).map((r) => r.role as Role);
}
async function assertStaff(userId: string) {
  const r = await getRoles(userId);
  if (!(r.includes("admin") || r.includes("moderator") || r.includes("scholar")))
    throw new Error("Forbidden");
  return r;
}
async function assertAdmin(userId: string) {
  const r = await getRoles(userId);
  if (!r.includes("admin")) throw new Error("Forbidden");
}

function getClientIp(): string | null {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf) return cf;
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  const real = getRequestHeader("x-real-ip");
  return real ?? null;
}

// ---------------- USER FACING ----------------

export const listCategories = createServerFn({ method: "POST" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("quiz_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listQuizzes = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({ categorySlug: z.string().max(60).optional(), publishedOnly: z.boolean().default(true) })
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("quizzes")
      .select(
        "id, category_id, title_en, title_bn, description_en, description_bn, difficulty, time_limit_seconds, pass_mark, max_attempts, starts_at, ends_at, timezone, published, updated_at, quiz_categories(slug, name_en, name_bn, color, icon)",
      )
      .order("updated_at", { ascending: false });
    if (data.publishedOnly) q = q.eq("published", true);
    if (data.categorySlug) {
      const { data: cat } = await supabaseAdmin
        .from("quiz_categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      if (!cat) return [];
      q = q.eq("category_id", cat.id);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // attach question count
    const ids = (rows ?? []).map((r) => r.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: qs } = await supabaseAdmin
        .from("quiz_questions")
        .select("quiz_id")
        .in("quiz_id", ids);
      for (const q of qs ?? []) counts[q.quiz_id] = (counts[q.quiz_id] ?? 0) + 1;
    }
    return (rows ?? []).map((r) => ({ ...r, question_count: counts[r.id] ?? 0 }));
  });

export const getQuizForPlay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: quiz, error } = await supabaseAdmin
      .from("quizzes")
      .select("*, quiz_categories(slug, name_en, name_bn, color, icon)")
      .eq("id", data.quizId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quiz) throw new Error("Quiz not found");

    const staffRoles = await getRoles(context.userId);
    const isStaff = staffRoles.some((r) => ["admin", "moderator", "scholar"].includes(r));
    if (!quiz.published && !isStaff) throw new Error("Quiz not available");

    const now = Date.now();
    if (!isStaff) {
      if (quiz.starts_at && new Date(quiz.starts_at).getTime() > now)
        throw new Error("Quiz has not started yet");
      if (quiz.ends_at && new Date(quiz.ends_at).getTime() < now)
        throw new Error("Quiz has ended");
    }

    const { data: questions, error: qErr } = await supabaseAdmin
      .from("quiz_questions")
      .select("id, type, text_en, text_bn, options_en, options_bn, points, order_index, correct_indices, correct_text, correct_order, image_url, hint_en, hint_bn, explanation_en, explanation_bn")
      .eq("quiz_id", data.quizId)
      .order("order_index", { ascending: true });
    if (qErr) throw new Error(qErr.message);

    // Only expose correct answers + explanations when instant feedback is enabled
    const cleaned = (questions ?? []).map((q) =>
      quiz.instant_feedback
        ? q
        : { ...q, correct_indices: [] as number[], correct_text: [] as string[], correct_order: [] as number[], explanation_en: null, explanation_bn: null },
    );
    return { quiz, questions: cleaned };
  });

export const attemptsLeft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ quizId: z.string().uuid(), fingerprint: z.string().max(120).nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const ip = getClientIp();
    const { data: rpc, error } = await supabaseAdmin.rpc("attempts_left", {
      _user_id: context.userId,
      _quiz_id: data.quizId,
      _ip: (ip ?? "") as string,
      _fingerprint: (data.fingerprint ?? "") as string,
    });
    if (error) throw new Error(error.message);
    return { left: rpc as number };
  });

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        quizId: z.string().uuid(),
        answers: z.record(
          z.string().uuid(),
          z.union([z.array(z.number().int().min(0).max(7)), z.string().max(300)]),
        ),
        timeTaken: z.number().int().min(0).max(7200),
        fingerprint: z.string().max(120).nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const ip = getClientIp();
    const ua = getRequestHeader("user-agent") ?? null;

    // user-context client (RLS as user) — but we use admin to also get correct answers afterwards
    const { data: result, error } = await context.supabase.rpc("submit_quiz_attempt", {
      _quiz_id: data.quizId,
      _answers: data.answers,
      _time_taken: data.timeTaken,
      _ip: (ip ?? "") as string,
      _fingerprint: (data.fingerprint ?? "") as string,
      _ua: (ua ?? "") as string,
    });
    if (error) throw new Error(error.message);

    // include correct answers + explanations for review screen
    const { data: questions } = await supabaseAdmin
      .from("quiz_questions")
      .select("id, correct_indices, explanation_en, explanation_bn")
      .eq("quiz_id", data.quizId);

    return { result, questions: questions ?? [] };
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("quiz_bookmarks")
      .select("id")
      .eq("quiz_id", data.quizId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase.from("quiz_bookmarks").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { bookmarked: false };
    }
    const { error } = await context.supabase
      .from("quiz_bookmarks")
      .insert({ quiz_id: data.quizId, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { bookmarked: true };
  });

export const listBookmarks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quiz_bookmarks")
      .select("quiz_id, created_at, quizzes(id, title_en, title_bn, description_en, description_bn, difficulty, time_limit_seconds, starts_at, ends_at, timezone, category_id, quiz_categories(slug, name_en, name_bn, color))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quiz_attempts")
      .select("id, quiz_id, score, total, points_awarded, time_taken_seconds, completed_at, quizzes(title_en, title_bn)")
      .order("completed_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getLeaderboard = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        quizId: z.string().uuid().nullable().optional(),
        categoryId: z.string().uuid().nullable().optional(),
        period: z.enum(["all", "week", "month"]).default("all"),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin.rpc("get_quiz_leaderboard", {
      _quiz_id: (data.quizId ?? undefined) as string | undefined,
      _category_id: (data.categoryId ?? undefined) as string | undefined,
      _period: data.period,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAttemptReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ attemptId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: attempt, error } = await supabaseAdmin
      .from("quiz_attempts")
      .select("*")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!attempt) throw new Error("Attempt not found");

    const roles = await getRoles(context.userId);
    const isStaff = roles.some((r) => ["admin", "moderator", "scholar"].includes(r));
    if (attempt.user_id !== context.userId && !isStaff) throw new Error("Forbidden");

    const { data: quiz } = await supabaseAdmin
      .from("quizzes")
      .select("id, title_en, title_bn, time_limit_seconds, pass_mark, instant_feedback, quiz_categories(slug, name_en, name_bn)")
      .eq("id", attempt.quiz_id)
      .maybeSingle();

    const { data: questions } = await supabaseAdmin
      .from("quiz_questions")
      .select("id, type, text_en, text_bn, options_en, options_bn, points, order_index, correct_indices, explanation_en, explanation_bn")
      .eq("quiz_id", attempt.quiz_id)
      .order("order_index", { ascending: true });

    return { attempt, quiz, questions: questions ?? [] };
  });

// ---------------- ADMIN ----------------

export const adminListQuizzes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .select("*, quiz_categories(slug, name_en, name_bn)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((q) => q.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: qs } = await supabaseAdmin
        .from("quiz_questions")
        .select("quiz_id")
        .in("quiz_id", ids);
      for (const q of qs ?? []) counts[q.quiz_id] = (counts[q.quiz_id] ?? 0) + 1;
    }
    return (data ?? []).map((r) => ({ ...r, question_count: counts[r.id] ?? 0 }));
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => categorySchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("quiz_categories")
      .upsert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("quiz_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => quizSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const payload = { ...data, created_by: data.id ? undefined : context.userId };
    const { data: row, error } = await supabaseAdmin.from("quizzes").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("quizzes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: quiz, error } = await supabaseAdmin
      .from("quizzes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: questions, error: qErr } = await supabaseAdmin
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", data.id)
      .order("order_index", { ascending: true });
    if (qErr) throw new Error(qErr.message);
    return { quiz, questions: questions ?? [] };
  });

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => questionSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    if (data.options_en.length !== data.options_bn.length)
      throw new Error("English and Bangla option counts must match");
    if (data.correct_indices.some((idx) => idx >= data.options_en.length))
      throw new Error("correct_indices out of range");
    const { data: row, error } = await supabaseAdmin
      .from("quiz_questions")
      .upsert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("quiz_questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        items: z.array(z.object({ id: z.string().uuid(), order_index: z.number().int().min(0) })).max(500),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    for (const it of data.items) {
      const { error } = await supabaseAdmin
        .from("quiz_questions")
        .update({ order_index: it.order_index })
        .eq("id", it.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const bulkImportQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        quizId: z.string().uuid(),
        items: z.array(questionImportSchema).min(1).max(200),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: existing } = await supabaseAdmin
      .from("quiz_questions")
      .select("order_index")
      .eq("quiz_id", data.quizId)
      .order("order_index", { ascending: false })
      .limit(1);
    let next = (existing?.[0]?.order_index ?? -1) + 1;
    const rows = data.items.map((it) => ({ ...it, quiz_id: data.quizId, order_index: next++ }));
    const { error } = await supabaseAdmin.from("quiz_questions").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

export const adminListAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        quizId: z.string().uuid().nullable().optional(),
        userId: z.string().uuid().nullable().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    let q = supabaseAdmin
      .from("quiz_attempts")
      .select("id, user_id, quiz_id, score, total, points_awarded, time_taken_seconds, completed_at, ip_address")
      .order("completed_at", { ascending: false })
      .limit(data.limit);
    if (data.quizId) q = q.eq("quiz_id", data.quizId);
    if (data.userId) q = q.eq("user_id", data.userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const quizIds = Array.from(new Set(list.map((r) => r.quiz_id)));
    const [{ data: profs }, { data: quizzes }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] }),
      quizIds.length
        ? supabaseAdmin.from("quizzes").select("id, title_en, title_bn").in("id", quizIds)
        : Promise.resolve({ data: [] as { id: string; title_en: string; title_bn: string }[] }),
    ]);
    const pMap = new Map((profs ?? []).map((p) => [p.id, p]));
    const qMap = new Map((quizzes ?? []).map((q) => [q.id, q]));
    return list.map((r) => ({
      ...r,
      profiles: pMap.get(r.user_id) ?? null,
      quizzes: qMap.get(r.quiz_id) ?? null,
    }));
  });

// ---------------- AI ASSIST (OpenRouter) ----------------

export const generateQuestionsAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        topic: z.string().min(2).max(500),
        count: z.number().int().min(1).max(10).default(5),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        bilingual: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const sys = `You are an Islamic studies quiz writer. Generate authentic, well-sourced questions. Output ONLY valid JSON: an array with this shape per item: {"text_en": string, "text_bn": string, "options_en": [string,...], "options_bn": [string,...], "correct_indices": [int,...], "explanation_en": string, "explanation_bn": string, "type": "single"|"multi", "points": int}. Provide 4 options. Bangla translations must be accurate. No prose, no markdown fences.`;
    const usr = `Topic: ${data.topic}\nCount: ${data.count}\nDifficulty: ${data.difficulty}\nReturn a JSON array of ${data.count} multiple-choice questions about this topic.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://halaqah.lovable.app",
        "X-Title": "Halaqah Quiz Builder",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned invalid JSON. Try again.");
    }
    const itemsSchema = z.array(
      z.object({
        text_en: z.string().min(1),
        text_bn: z.string().min(1),
        options_en: z.array(z.string().min(1)).min(2).max(8),
        options_bn: z.array(z.string().min(1)).min(2).max(8),
        correct_indices: z.array(z.number().int().min(0).max(7)).min(1),
        explanation_en: z.string().nullable().optional(),
        explanation_bn: z.string().nullable().optional(),
        type: z.enum(["single", "multi"]).default("single"),
        points: z.number().int().min(1).max(100).default(10),
      }),
    );
    return itemsSchema.parse(parsed);
  });
