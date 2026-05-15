import { z } from "zod";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const QUESTION_TYPES = ["single", "multi"] as const;

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

export const questionSchema = z.object({
  id: z.string().uuid().optional(),
  quiz_id: z.string().uuid(),
  type: z.enum(QUESTION_TYPES),
  text_en: z.string().min(1).max(800),
  text_bn: z.string().min(1).max(800),
  options_en: z.array(z.string().min(1).max(300)).min(2).max(8),
  options_bn: z.array(z.string().min(1).max(300)).min(2).max(8),
  correct_indices: z.array(z.number().int().min(0).max(7)).min(1),
  explanation_en: z.string().max(800).nullable().optional(),
  explanation_bn: z.string().max(800).nullable().optional(),
  points: z.number().int().min(1).max(100).default(10),
  order_index: z.number().int().min(0).max(9999).default(0),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
