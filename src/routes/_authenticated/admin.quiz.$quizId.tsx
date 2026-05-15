import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Sparkles, Loader2, Upload, Download,
  Image as ImageIcon, X, ChevronUp, ChevronDown,
} from "lucide-react";

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
  bulkImportQuestions, generateQuestionsAI, uploadQuestionImage,
} from "@/lib/quiz.functions";
import {
  parseQuestionsCSV, questionsToCSV, QUESTION_CSV_TEMPLATE,
} from "@/lib/quiz.csv";
import type { QuestionType } from "@/lib/quiz.schemas";

export const Route = createFileRoute("/_authenticated/admin/quiz/$quizId")({
  component: QuestionEditor,
});

type QForm = {
  id?: string;
  quiz_id: string;
  type: QuestionType;
  text_en: string;
  text_bn: string;
  options_en: string[];
  options_bn: string[];
  correct_indices: number[];
  correct_text: string[];
  correct_order: number[];
  explanation_en: string;
  explanation_bn: string;
  hint_en: string;
  hint_bn: string;
  image_url: string | null;
  points: number;
  order_index: number;
};

function emptyQ(quizId: string, order: number, type: QuestionType = "single"): QForm {
  const base: QForm = {
    quiz_id: quizId,
    type,
    text_en: "",
    text_bn: "",
    options_en: ["", "", "", ""],
    options_bn: ["", "", "", ""],
    correct_indices: [0],
    correct_text: [],
    correct_order: [0, 1, 2, 3],
    explanation_en: "",
    explanation_bn: "",
    hint_en: "",
    hint_bn: "",
    image_url: null,
    points: 10,
    order_index: order,
  };
  return applyTypeShape(base, type);
}

function applyTypeShape(q: QForm, type: QuestionType): QForm {
  const next: QForm = { ...q, type };
  if (type === "true_false") {
    next.options_en = ["True", "False"];
    next.options_bn = ["সত্য", "মিথ্যা"];
    next.correct_indices = next.correct_indices.length === 1 && next.correct_indices[0] < 2 ? next.correct_indices : [0];
    next.correct_text = [];
    next.correct_order = [];
  } else if (type === "fill_blank") {
    next.options_en = [];
    next.options_bn = [];
    next.correct_indices = [];
    next.correct_order = [];
    if (next.correct_text.length === 0) next.correct_text = [""];
  } else if (type === "ordering") {
    if (next.options_en.length < 2) {
      next.options_en = ["", "", "", ""];
      next.options_bn = ["", "", "", ""];
    }
    next.correct_indices = [];
    next.correct_text = [];
    next.correct_order = next.options_en.map((_, i) => i);
  } else if (type === "single") {
    next.correct_indices = next.correct_indices.slice(0, 1);
    next.correct_text = [];
    next.correct_order = [];
  } else if (type === "multi") {
    if (next.correct_indices.length === 0) next.correct_indices = [0];
    next.correct_text = [];
    next.correct_order = [];
  }
  return next;
}

function downloadFile(name: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result ?? ""));
    r.onerror = () => rej(r.error);
    r.readAsText(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result ?? ""));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
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
  const uploadFn = useServerFn(uploadQuestionImage);

  const data = useQuery({
    queryKey: ["admin-quiz", quizId],
    queryFn: () => getFn({ data: { id: quizId } }),
  });

  const [editing, setEditing] = React.useState<QForm | null>(null);
  const [aiOpen, setAiOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);

  const upM = useMutation({
    mutationFn: (q: QForm) =>
      upFn({
        data: {
          ...q,
          explanation_en: q.explanation_en || null,
          explanation_bn: q.explanation_bn || null,
          hint_en: q.hint_en || null,
          hint_bn: q.hint_bn || null,
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

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const txt = await readFileAsText(file);
      const rows = parseQuestionsCSV(txt);
      if (rows.length === 0) throw new Error("No rows found in CSV");
      await bulkFn({ data: { quizId, items: rows } });
      qc.invalidateQueries({ queryKey: ["admin-quiz", quizId] });
      toast.success(`${rows.length} ${t("admin.quiz.questions", { defaultValue: "questions" })} imported`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExport = () => {
    if (!data.data) return;
    const csv = questionsToCSV(
      data.data.questions.map((q) => ({
        type: q.type,
        text_en: q.text_en,
        text_bn: q.text_bn,
        options_en: q.options_en as string[],
        options_bn: q.options_bn as string[],
        correct_indices: q.correct_indices ?? [],
        correct_text: q.correct_text ?? [],
        correct_order: q.correct_order ?? [],
        explanation_en: q.explanation_en,
        explanation_bn: q.explanation_bn,
        hint_en: q.hint_en,
        hint_bn: q.hint_bn,
        points: q.points,
        image_url: q.image_url,
      })),
    );
    downloadFile(`quiz-${quizId}.csv`, csv);
  };

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
        <p className="text-xs text-muted-foreground mt-0.5">{questions.length} {t("admin.quiz.questions", { defaultValue: "questions" })}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing(emptyQ(quizId, next))}>
          <Plus className="h-4 w-4 mr-1" /> {t("admin.quiz.addQuestion")}
        </Button>
        <Button variant="outline" onClick={() => setAiOpen(true)}>
          <Sparkles className="h-4 w-4 mr-1" /> {t("admin.quiz.aiAssist")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
        />
        <Button variant="outline" disabled={importing} onClick={() => fileRef.current?.click()}>
          {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          {t("admin.quiz.importCsv", { defaultValue: "Import CSV" })}
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={questions.length === 0}>
          <Download className="h-4 w-4 mr-1" /> {t("admin.quiz.exportCsv", { defaultValue: "Export CSV" })}
        </Button>
        <Button variant="ghost" onClick={() => downloadFile("quiz-template.csv", QUESTION_CSV_TEMPLATE)}>
          {t("admin.quiz.csvTemplate", { defaultValue: "Download template" })}
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
              <div className="font-medium text-foreground line-clamp-2">{isBn ? q.text_bn : q.text_en}</div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>{q.points} pts</span>
                <span>•</span>
                <span>{t(`admin.quiz.type.${q.type}`, { defaultValue: q.type })}</span>
                {q.image_url && (<><span>•</span><span className="inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" /> image</span></>)}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(toForm(q, quizId))}>
              {t("common.edit", { defaultValue: "Edit" })}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete?")) delM.mutate(q.id); }}>
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            </Button>
          </div>
        ))}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.quiz.question")}</DialogTitle></DialogHeader>
          {editing && (
            <EditorBody
              q={editing}
              onChange={setEditing}
              onUpload={async (file) => {
                const dataUrl = await readFileAsDataUrl(file);
                const r = await uploadFn({ data: { dataUrl, filename: file.name } });
                setEditing((prev) => (prev ? { ...prev, image_url: r.url } : prev));
              }}
            />
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
                correct_text: [],
                correct_order: [],
                explanation_en: it.explanation_en ?? null,
                explanation_bn: it.explanation_bn ?? null,
                hint_en: null,
                hint_bn: null,
                image_url: null,
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

function toForm(q: { id: string; quiz_id: string; type: string; text_en: string; text_bn: string; options_en: unknown; options_bn: unknown; correct_indices: number[] | null; correct_text: string[] | null; correct_order: number[] | null; explanation_en: string | null; explanation_bn: string | null; hint_en: string | null; hint_bn: string | null; image_url: string | null; points: number; order_index: number; }, quizId: string): QForm {
  return {
    id: q.id,
    quiz_id: q.quiz_id ?? quizId,
    type: (q.type as QuestionType) ?? "single",
    text_en: q.text_en,
    text_bn: q.text_bn,
    options_en: (q.options_en as string[]) ?? [],
    options_bn: (q.options_bn as string[]) ?? [],
    correct_indices: q.correct_indices ?? [],
    correct_text: q.correct_text ?? [],
    correct_order: q.correct_order ?? [],
    explanation_en: q.explanation_en ?? "",
    explanation_bn: q.explanation_bn ?? "",
    hint_en: q.hint_en ?? "",
    hint_bn: q.hint_bn ?? "",
    image_url: q.image_url ?? null,
    points: q.points,
    order_index: q.order_index,
  };
}

function EditorBody({
  q, onChange, onUpload,
}: {
  q: QForm;
  onChange: (q: QForm) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const { t } = useTranslation();
  const imgRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const updateOpt = (lang: "en" | "bn", i: number, v: string) => {
    const key = lang === "en" ? "options_en" : "options_bn";
    const arr = [...q[key]];
    arr[i] = v;
    onChange({ ...q, [key]: arr });
  };

  const addOption = () => {
    if (q.options_en.length >= 8) return;
    onChange({
      ...q,
      options_en: [...q.options_en, ""],
      options_bn: [...q.options_bn, ""],
      correct_order: q.type === "ordering" ? [...q.correct_order, q.options_en.length] : q.correct_order,
    });
  };
  const removeOption = (i: number) => {
    if (q.options_en.length <= 2) return;
    onChange({
      ...q,
      options_en: q.options_en.filter((_, j) => j !== i),
      options_bn: q.options_bn.filter((_, j) => j !== i),
      correct_indices: q.correct_indices.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)),
      correct_order: q.type === "ordering"
        ? q.correct_order.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x))
        : q.correct_order,
    });
  };

  const moveCorrect = (pos: number, dir: -1 | 1) => {
    const target = pos + dir;
    if (target < 0 || target >= q.correct_order.length) return;
    const next = [...q.correct_order];
    [next[pos], next[target]] = [next[target], next[pos]];
    onChange({ ...q, correct_order: next });
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>{t("admin.quiz.questionType", { defaultValue: "Type" })}</Label>
          <Select value={q.type} onValueChange={(v) => onChange(applyTypeShape(q, v as QuestionType))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">{t("admin.quiz.type.single", { defaultValue: "Single answer" })}</SelectItem>
              <SelectItem value="multi">{t("admin.quiz.type.multi", { defaultValue: "Multiple answers" })}</SelectItem>
              <SelectItem value="true_false">{t("admin.quiz.type.true_false", { defaultValue: "True / False" })}</SelectItem>
              <SelectItem value="fill_blank">{t("admin.quiz.type.fill_blank", { defaultValue: "Fill in the blank" })}</SelectItem>
              <SelectItem value="ordering">{t("admin.quiz.type.ordering", { defaultValue: "Ordering" })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("quiz.points")}</Label>
          <Input type="number" value={q.points} onChange={(e) => onChange({ ...q, points: +e.target.value })} />
        </div>
      </div>

      <div>
        <Label>Question (EN)</Label>
        <Textarea rows={2} value={q.text_en} onChange={(e) => onChange({ ...q, text_en: e.target.value })} />
      </div>
      <div>
        <Label>Question (BN)</Label>
        <Textarea rows={2} value={q.text_bn} onChange={(e) => onChange({ ...q, text_bn: e.target.value })} />
      </div>

      {/* IMAGE */}
      <div>
        <Label>{t("admin.quiz.image", { defaultValue: "Image (optional)" })}</Label>
        {q.image_url ? (
          <div className="mt-1 flex items-start gap-2">
            <img src={q.image_url} alt="" className="h-24 w-24 object-cover rounded-lg border border-border" />
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...q, image_url: null })}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="mt-1">
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                try { await onUpload(f); } catch (err) { toast.error((err as Error).message); }
                finally { setUploading(false); if (imgRef.current) imgRef.current.value = ""; }
              }}
            />
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => imgRef.current?.click()}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5 mr-1" />}
              {t("admin.quiz.uploadImage", { defaultValue: "Upload image" })}
            </Button>
          </div>
        )}
      </div>

      {/* TYPE-SPECIFIC EDITORS */}
      {(q.type === "single" || q.type === "multi") && (
        <OptionsEditor
          q={q}
          onUpdateOpt={updateOpt}
          onAdd={addOption}
          onRemove={removeOption}
          onToggleCorrect={(i) => {
            const cur = q.correct_indices;
            if (q.type === "single") onChange({ ...q, correct_indices: [i] });
            else onChange({ ...q, correct_indices: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort() });
          }}
          inputType={q.type === "single" ? "radio" : "checkbox"}
          allowAddRemove
        />
      )}

      {q.type === "true_false" && (
        <OptionsEditor
          q={q}
          onUpdateOpt={updateOpt}
          onAdd={addOption}
          onRemove={removeOption}
          onToggleCorrect={(i) => onChange({ ...q, correct_indices: [i] })}
          inputType="radio"
          allowAddRemove={false}
        />
      )}

      {q.type === "fill_blank" && (
        <div>
          <Label>{t("admin.quiz.acceptedAnswers", { defaultValue: "Accepted answers (case-insensitive)" })}</Label>
          <div className="space-y-2 mt-1">
            {q.correct_text.map((v, i) => (
              <div key={i} className="flex gap-2">
                <Input value={v} onChange={(e) => {
                  const arr = [...q.correct_text]; arr[i] = e.target.value;
                  onChange({ ...q, correct_text: arr });
                }} />
                <Button size="sm" variant="ghost" onClick={() => {
                  if (q.correct_text.length <= 1) return;
                  onChange({ ...q, correct_text: q.correct_text.filter((_, j) => j !== i) });
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => onChange({ ...q, correct_text: [...q.correct_text, ""] })}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("admin.quiz.addAnswer", { defaultValue: "Add answer" })}
            </Button>
          </div>
        </div>
      )}

      {q.type === "ordering" && (
        <>
          <OptionsEditor
            q={q}
            onUpdateOpt={updateOpt}
            onAdd={addOption}
            onRemove={removeOption}
            onToggleCorrect={() => {}}
            inputType="none"
            allowAddRemove
          />
          <div>
            <Label>{t("admin.quiz.correctOrder", { defaultValue: "Correct order" })}</Label>
            <div className="space-y-1.5 mt-1">
              {q.correct_order.map((origIdx, pos) => (
                <div key={pos} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                  <span className="h-6 w-6 rounded-full bg-muted text-xs font-bold flex items-center justify-center">{pos + 1}</span>
                  <span className="flex-1 text-sm">{q.options_en[origIdx] || `Option ${origIdx + 1}`}</span>
                  <button type="button" className="h-6 w-6 rounded border border-border hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center"
                    disabled={pos === 0} onClick={() => moveCorrect(pos, -1)}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="h-6 w-6 rounded border border-border hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center"
                    disabled={pos === q.correct_order.length - 1} onClick={() => moveCorrect(pos, 1)}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <Label>{t("admin.quiz.hint", { defaultValue: "Hint" })} (EN)</Label>
        <Textarea rows={2} value={q.hint_en} onChange={(e) => onChange({ ...q, hint_en: e.target.value })} />
      </div>
      <div>
        <Label>{t("admin.quiz.hint", { defaultValue: "Hint" })} (BN)</Label>
        <Textarea rows={2} value={q.hint_bn} onChange={(e) => onChange({ ...q, hint_bn: e.target.value })} />
      </div>
      <div>
        <Label>Explanation (EN)</Label>
        <Textarea rows={2} value={q.explanation_en} onChange={(e) => onChange({ ...q, explanation_en: e.target.value })} />
      </div>
      <div>
        <Label>Explanation (BN)</Label>
        <Textarea rows={2} value={q.explanation_bn} onChange={(e) => onChange({ ...q, explanation_bn: e.target.value })} />
      </div>
    </div>
  );
}

function OptionsEditor({
  q, onUpdateOpt, onAdd, onRemove, onToggleCorrect, inputType, allowAddRemove,
}: {
  q: QForm;
  onUpdateOpt: (lang: "en" | "bn", i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onToggleCorrect: (i: number) => void;
  inputType: "radio" | "checkbox" | "none";
  allowAddRemove: boolean;
}) {
  return (
    <div>
      <Label>Options</Label>
      <div className="space-y-2 mt-1">
        {q.options_en.map((opt, i) => {
          const checked = q.correct_indices.includes(i);
          return (
            <div key={i} className="flex gap-2 items-center">
              {inputType !== "none" ? (
                <input
                  type={inputType}
                  name="correct"
                  checked={checked}
                  onChange={() => onToggleCorrect(i)}
                  className="h-4 w-4"
                />
              ) : (
                <span className="h-7 w-7 rounded-full bg-muted text-xs font-bold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
              )}
              <Input placeholder={`EN ${i + 1}`} value={opt} onChange={(e) => onUpdateOpt("en", i, e.target.value)} />
              <Input placeholder={`BN ${i + 1}`} value={q.options_bn[i] ?? ""} onChange={(e) => onUpdateOpt("bn", i, e.target.value)} />
              {allowAddRemove && (
                <Button size="sm" variant="ghost" onClick={() => onRemove(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
        {allowAddRemove && q.options_en.length < 8 && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add option
          </Button>
        )}
      </div>
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
