import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminListQuizzes,
  upsertQuiz,
  deleteQuiz,
  listCategories,
} from "@/lib/quiz.functions";
import { useUserRole } from "@/hooks/use-user-role";
import {
  COMMON_TIMEZONES,
  getBrowserTz,
  localInputToUtc,
  utcToLocalInput,
  formatInTz,
} from "@/lib/timezone";

export const Route = createFileRoute("/_authenticated/admin/quiz/")({
  component: AdminQuizList,
});

type QuizForm = {
  id?: string;
  category_id: string | null;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  difficulty: "easy" | "medium" | "hard";
  time_limit_seconds: number;
  pass_mark: number;
  instant_feedback: boolean;
  max_attempts: number;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  published: boolean;
};

const EMPTY: QuizForm = {
  category_id: null,
  title_en: "",
  title_bn: "",
  description_en: "",
  description_bn: "",
  difficulty: "easy",
  time_limit_seconds: 600,
  pass_mark: 60,
  instant_feedback: false,
  max_attempts: 1,
  starts_at: null,
  ends_at: null,
  timezone: "UTC",
  published: false,
};

function AdminQuizList() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const qc = useQueryClient();
  const { isAdmin } = useUserRole();

  const listFn = useServerFn(adminListQuizzes);
  const upsertFn = useServerFn(upsertQuiz);
  const delFn = useServerFn(deleteQuiz);
  const catsFn = useServerFn(listCategories);

  const list = useQuery({ queryKey: ["admin-quizzes"], queryFn: () => listFn() });
  const cats = useQuery({ queryKey: ["quiz-categories"], queryFn: () => catsFn() });

  const [editing, setEditing] = React.useState<QuizForm | null>(null);

  const upsertM = useMutation({
    mutationFn: (data: QuizForm) => {
      const tz = data.timezone || "UTC";
      const startsUtc = data.starts_at ? localInputToUtc(data.starts_at, tz) : null;
      const endsUtc = data.ends_at ? localInputToUtc(data.ends_at, tz) : null;
      return upsertFn({
        data: {
          ...data,
          description_en: data.description_en || null,
          description_bn: data.description_bn || null,
          starts_at: startsUtc,
          ends_at: endsUtc,
          timezone: tz,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quizzes"] });
      toast.success(t("common.save"));
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quizzes"] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-foreground">{t("admin.quiz.title")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/quiz/categories">{t("admin.quiz.categories")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/quiz/attempts">{t("admin.quiz.attempts")}</Link>
          </Button>
          <Button onClick={() => setEditing({ ...EMPTY, timezone: getBrowserTz() })}>
            <Plus className="h-4 w-4 mr-1" /> {t("admin.quiz.new")}
          </Button>
        </div>
      </div>

      <Card className="divide-y divide-border">
        {list.isLoading && <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>}
        {list.data?.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.quiz.empty")}</div>
        )}
        {list.data?.map((q) => (
          <div key={q.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground truncate">
                  {isBn ? q.title_bn : q.title_en}
                </span>
                <Badge variant={q.published ? "default" : "secondary"}>
                  {q.published ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                  {q.published ? t("admin.quiz.published") : t("admin.quiz.draft")}
                </Badge>
                <Badge variant="outline">{t(`quiz.difficulty.${q.difficulty}`)}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {q.question_count} {t("quiz.questions")} • {Math.round(q.time_limit_seconds / 60)}m
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/admin/quiz/$quizId" params={{ quizId: q.id }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> {t("admin.quiz.editQuestions")}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const tz = (q as { timezone?: string | null }).timezone || getBrowserTz();
                  setEditing({
                    id: q.id,
                    category_id: q.category_id,
                    title_en: q.title_en,
                    title_bn: q.title_bn,
                    description_en: q.description_en ?? "",
                    description_bn: q.description_bn ?? "",
                    difficulty: q.difficulty as "easy" | "medium" | "hard",
                    time_limit_seconds: q.time_limit_seconds,
                    pass_mark: q.pass_mark,
                    instant_feedback: q.instant_feedback,
                    max_attempts: q.max_attempts,
                    starts_at: q.starts_at ? utcToLocalInput(q.starts_at, tz) : null,
                    ends_at: q.ends_at ? utcToLocalInput(q.ends_at, tz) : null,
                    timezone: tz,
                    published: q.published,
                  });
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(t("admin.quiz.confirmDelete"))) delM.mutate(q.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("admin.quiz.edit") : t("admin.quiz.new")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>{t("admin.quiz.category")}</Label>
                <Select
                  value={editing.category_id ?? ""}
                  onValueChange={(v) => setEditing({ ...editing, category_id: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {cats.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {isBn ? c.name_bn : c.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title (EN)</Label>
                <Input value={editing.title_en} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} />
              </div>
              <div>
                <Label>Title (BN)</Label>
                <Input value={editing.title_bn} onChange={(e) => setEditing({ ...editing, title_bn: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description (EN)</Label>
                <Textarea rows={2} value={editing.description_en} onChange={(e) => setEditing({ ...editing, description_en: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description (BN)</Label>
                <Textarea rows={2} value={editing.description_bn} onChange={(e) => setEditing({ ...editing, description_bn: e.target.value })} />
              </div>
              <div>
                <Label>{t("admin.quiz.difficulty")}</Label>
                <Select value={editing.difficulty} onValueChange={(v) => setEditing({ ...editing, difficulty: v as "easy" | "medium" | "hard" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("quiz.timeLimit")} (s)</Label>
                <Input type="number" value={editing.time_limit_seconds} onChange={(e) => setEditing({ ...editing, time_limit_seconds: +e.target.value })} />
              </div>
              <div>
                <Label>{t("quiz.passMark")} (%)</Label>
                <Input type="number" value={editing.pass_mark} onChange={(e) => setEditing({ ...editing, pass_mark: +e.target.value })} />
              </div>
              <div>
                <Label>{t("admin.quiz.maxAttempts")}</Label>
                <Input type="number" min={0} value={editing.max_attempts} onChange={(e) => setEditing({ ...editing, max_attempts: +e.target.value })} />
                <p className="text-[11px] text-muted-foreground mt-1">{t("admin.quiz.maxAttemptsHint")}</p>
              </div>
              <div>
                <Label>{t("admin.quiz.startsAt")}</Label>
                <Input type="datetime-local" value={editing.starts_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value || null })} />
              </div>
              <div>
                <Label>{t("admin.quiz.endsAt")}</Label>
                <Input type="datetime-local" value={editing.ends_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value || null })} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={editing.instant_feedback} onCheckedChange={(v) => setEditing({ ...editing, instant_feedback: v })} />
                <Label>{t("admin.quiz.instantFeedback")}</Label>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
                <Label>{t("admin.quiz.published")}</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
            <Button disabled={upsertM.isPending} onClick={() => editing && upsertM.mutate(editing)}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
