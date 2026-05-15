import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  adminGetQuiz, upsertQuestion, deleteQuestion,
  bulkImportQuestions, generateQuestionsAI,
} from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/admin/quiz/$quizId")({
  component: QuestionEditor,
});

type QForm = {
  id?: string;
  quiz_id: string;
  type: "single" | "multi";
  text_en: string;
  text_bn: string;
  options_en: string[];
  options_bn: string[];
  correct_indices: number[];
  explanation_en: string;
  explanation_bn: string;
  points: number;
  order_index: number;
};

function emptyQ(quizId: string, order: number): QForm {
  return {
    quiz_id: quizId,
    type: "single",
    text_en: "",
    text_bn: "",
    options_en: ["", "", "", ""],
    options_bn: ["", "", "", ""],
    correct_indices: [0],
    explanation_en: "",
    explanation_bn: "",
    points: 10,
    order_index: order,
  };
}

function QuestionEditor() {
  const { quizId } = Route.useParams();
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const qc = useQueryClient();

  const getFn = useServerFn(adminGetQuiz);
  const upFn = useServerFn(upsertQuestion);
  const delFn = useServerFn(deleteQuestion);
  const bulkFn = useServerFn(bulkImportQuestions);
  const aiFn = useServerFn(generateQuestionsAI);

  const data = useQuery({
    queryKey: ["admin-quiz", quizId],
    queryFn: () => getFn({ data: { id: quizId } }),
  });

  const [editing, setEditing] = React.useState<QForm | null>(null);
  const [aiOpen, setAiOpen] = React.useState(false);

  const upM = useMutation({
    mutationFn: (q: QForm) =>
      upFn({
        data: {
          ...q,
          explanation_en: q.explanation_en || null,
          explanation_bn: q.explanation_bn || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quiz", quizId] });
      toast.success(t("common.save"));
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quiz", quizId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (data.isLoading) return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (!data.data) return null;

  const { quiz, questions } = data.data;
  const next = questions.length;

  return (
    <div className="space-y-4">
      <Link to="/admin/quiz" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("admin.quiz.title")}
      </Link>
      <div>
        <h2 className="text-xl font-semibold text-foreground">{isBn ? quiz.title_bn : quiz.title_en}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{questions.length} {t("quiz.questions")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing(emptyQ(quizId, next))}>
          <Plus className="h-4 w-4 mr-1" /> {t("admin.quiz.addQuestion")}
        </Button>
        <Button variant="outline" onClick={() => setAiOpen(true)}>
          <Sparkles className="h-4 w-4 mr-1" /> {t("admin.quiz.aiAssist")}
        </Button>
      </div>

      <Card className="divide-y divide-border">
        {questions.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.quiz.noQuestions")}</div>
        )}
        {questions.map((q, i) => (
          <div key={q.id} className="p-4 flex items-start gap-3">
            <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full h-6 w-6 flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">{isBn ? q.text_bn : q.text_en}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {q.points} pts • {q.type} • {q.correct_indices.length} correct
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing({ ...(q as unknown as QForm) })}>
              {t("common.edit", { defaultValue: "Edit" })}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete?")) delM.mutate(q.id); }}>
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            </Button>
          </div>
        ))}
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.quiz.question")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as "single" | "multi", correct_indices: v === "single" ? editing.correct_indices.slice(0, 1) : editing.correct_indices })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single answer</SelectItem>
                      <SelectItem value="multi">Multiple answers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("quiz.points")}</Label>
                  <Input type="number" value={editing.points} onChange={(e) => setEditing({ ...editing, points: +e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Question (EN)</Label>
                <Textarea rows={2} value={editing.text_en} onChange={(e) => setEditing({ ...editing, text_en: e.target.value })} />
              </div>
              <div>
                <Label>Question (BN)</Label>
                <Textarea rows={2} value={editing.text_bn} onChange={(e) => setEditing({ ...editing, text_bn: e.target.value })} />
              </div>
              <div>
                <Label>Options</Label>
                <div className="space-y-2 mt-1">
                  {editing.options_en.map((opt, i) => {
                    const checked = editing.correct_indices.includes(i);
                    return (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type={editing.type === "single" ? "radio" : "checkbox"}
                          name="correct"
                          checked={checked}
                          onChange={() => {
                            const cur = editing.correct_indices;
                            if (editing.type === "single") setEditing({ ...editing, correct_indices: [i] });
                            else setEditing({ ...editing, correct_indices: checked ? cur.filter((x) => x !== i) : [...cur, i].sort() });
                          }}
                          className="h-4 w-4"
                        />
                        <Input placeholder={`EN ${i + 1}`} value={opt} onChange={(e) => {
                          const a = [...editing.options_en]; a[i] = e.target.value; setEditing({ ...editing, options_en: a });
                        }} />
                        <Input placeholder={`BN ${i + 1}`} value={editing.options_bn[i] ?? ""} onChange={(e) => {
                          const a = [...editing.options_bn]; a[i] = e.target.value; setEditing({ ...editing, options_bn: a });
                        }} />
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (editing.options_en.length <= 2) return;
                          setEditing({
                            ...editing,
                            options_en: editing.options_en.filter((_, j) => j !== i),
                            options_bn: editing.options_bn.filter((_, j) => j !== i),
                            correct_indices: editing.correct_indices.filter((x) => x !== i).map((x) => x > i ? x - 1 : x),
                          });
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  {editing.options_en.length < 8 && (
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, options_en: [...editing.options_en, ""], options_bn: [...editing.options_bn, ""] })}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add option
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Explanation (EN)</Label>
                <Textarea rows={2} value={editing.explanation_en} onChange={(e) => setEditing({ ...editing, explanation_en: e.target.value })} />
              </div>
              <div>
                <Label>Explanation (BN)</Label>
                <Textarea rows={2} value={editing.explanation_bn} onChange={(e) => setEditing({ ...editing, explanation_bn: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
            <Button disabled={upM.isPending} onClick={() => editing && upM.mutate(editing)}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AIDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerate={async (topic, count, difficulty) => {
          const items = await aiFn({ data: { topic, count, difficulty, bilingual: true } });
          await bulkFn({
            data: {
              quizId,
              items: items.map((it) => ({
                type: it.type,
                text_en: it.text_en,
                text_bn: it.text_bn,
                options_en: it.options_en,
                options_bn: it.options_bn,
                correct_indices: it.correct_indices,
                explanation_en: it.explanation_en ?? null,
                explanation_bn: it.explanation_bn ?? null,
                points: it.points,
              })),
            },
          });
          qc.invalidateQueries({ queryKey: ["admin-quiz", quizId] });
          toast.success(`${items.length} questions added`);
          setAiOpen(false);
        }}
      />
    </div>
  );
}

function AIDialog({
  open, onClose, onGenerate,
}: { open: boolean; onClose: () => void; onGenerate: (topic: string, count: number, difficulty: "easy" | "medium" | "hard") => Promise<void> }) {
  const { t } = useTranslation();
  const [topic, setTopic] = React.useState("");
  const [count, setCount] = React.useState(5);
  const [difficulty, setDifficulty] = React.useState<"easy" | "medium" | "hard">("medium");
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("admin.quiz.aiAssist")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("admin.quiz.aiTopic")}</Label>
            <Textarea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Pillars of Islam, basics of Salah" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Count</Label>
              <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(+e.target.value)} />
            </div>
            <div>
              <Label>{t("admin.quiz.difficulty")}</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            disabled={busy || topic.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              try { await onGenerate(topic.trim(), count, difficulty); }
              catch (e) { toast.error((e as Error).message); }
              finally { setBusy(false); }
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {t("admin.quiz.generate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
