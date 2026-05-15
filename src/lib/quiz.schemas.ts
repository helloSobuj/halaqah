import { z } from "zod";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const QUESTION_TYPES = ["single", "multi", "true_false", "fill_blank", "ordering"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  name_en: z.string().min(1).max(80),
  name_bn: z.string().min(1).max(80),
  icon: z.string().max(40).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const quizSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable(),
  title_en: z.string().min(1).max(160),
  title_bn: z.string().min(1).max(160),
  description_en: z.string().max(800).nullable().optional(),
  description_bn: z.string().max(800).nullable().optional(),
  difficulty: z.enum(DIFFICULTIES),
  time_limit_seconds: z.number().int().min(30).max(7200),
  pass_mark: z.number().int().min(0).max(100),
  instant_feedback: z.boolean(),
  max_attempts: z.number().int().min(0).max(100),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  timezone: z.string().min(1).max(64).default("UTC"),
  published: z.boolean(),
});

export const questionBaseSchema = z.object({
    id: z.string().uuid().optional(),
    quiz_id: z.string().uuid(),
    type: z.enum(QUESTION_TYPES),
    text_en: z.string().min(1).max(800),
    text_bn: z.string().min(1).max(800),
    options_en: z.array(z.string().max(300)).max(8).default([]),
    options_bn: z.array(z.string().max(300)).max(8).default([]),
    correct_indices: z.array(z.number().int().min(0).max(7)).default([]),
    correct_text: z.array(z.string().min(1).max(300)).max(20).default([]),
    correct_order: z.array(z.number().int().min(0).max(7)).default([]),
    image_url: z.string().url().max(800).nullable().optional(),
    explanation_en: z.string().max(800).nullable().optional(),
    explanation_bn: z.string().max(800).nullable().optional(),
    hint_en: z.string().max(400).nullable().optional(),
    hint_bn: z.string().max(400).nullable().optional(),
    points: z.number().int().min(1).max(100).default(10),
    order_index: z.number().int().min(0).max(9999).default(0),
  })
  .superRefine((d, ctx) => {
    const needsOpts = ["single", "multi", "true_false", "ordering"].includes(d.type);
    if (needsOpts) {
      if (d.options_en.length < 2 || d.options_bn.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least 2 options required" });
      }
      if (d.options_en.length !== d.options_bn.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "EN/BN option counts must match" });
      }
    }
    if (d.type === "single" || d.type === "true_false") {
      if (d.correct_indices.length !== 1)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Exactly 1 correct answer" });
    }
    if (d.type === "multi") {
      if (d.correct_indices.length < 1)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least 1 correct answer" });
    }
    if (d.type === "fill_blank") {
      if (d.correct_text.length < 1)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least 1 accepted answer" });
    }
    if (d.type === "ordering") {
      if (d.correct_order.length !== d.options_en.length)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correct_order must include every option" });
    }
  });

export type CategoryInput = z.infer<typeof categorySchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
