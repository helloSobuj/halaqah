import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Check, X, Clock, Info, Lightbulb, ChevronUp, ChevronDown } from "lucide-react";

export type PlayQuestion = {
  id: string;
  type: "single" | "multi" | "true_false" | "fill_blank" | "ordering" | string;
  text_en: string;
  text_bn: string;
  options_en: string[];
  options_bn: string[];
  correct_indices?: number[];
  correct_text?: string[];
  correct_order?: number[];
  image_url?: string | null;
  hint_en?: string | null;
  hint_bn?: string | null;
  explanation_en?: string | null;
  explanation_bn?: string | null;
};

export type Answer = number[] | string;

// deterministic shuffle from question id so order is stable per session
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isAnswered(type: string, ans: Answer | undefined): boolean {
  if (ans == null) return type === "ordering"; // ordering has an inherent order
  if (typeof ans === "string") return ans.trim().length > 0;
  if (type === "ordering") return ans.length > 0;
  return ans.length > 0;
}

export function QuestionPlayer({
  questions,
  timeLimit,
  instantFeedback,
  onSubmit,
}: {
  questions: PlayQuestion[];
  timeLimit: number;
  instantFeedback: boolean;
  onSubmit: (answers: Record<string, Answer>, secs: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const [idx, setIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, Answer>>({});
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({});
  const [hintShown, setHintShown] = React.useState<Record<string, boolean>>({});
  const startedAt = React.useRef(Date.now());
  const [elapsed, setElapsed] = React.useState(0);
  const [blurCount, setBlurCount] = React.useState(0);

  React.useEffect(() => {
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        setBlurCount((c) => c + 1);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
      return () => document.removeEventListener("visibilitychange", onVis);
    }
  }, []);

  const perQ = questions.length > 0 ? Math.max(5, Math.floor(timeLimit / questions.length)) : timeLimit;
  const [qStart, setQStart] = React.useState(() => Date.now());
  const [qElapsed, setQElapsed] = React.useState(0);

  const submittedRef = React.useRef(false);
  const answersRef = React.useRef(answers);
  React.useEffect(() => { answersRef.current = answers; }, [answers]);

  React.useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      setQElapsed(Math.floor((Date.now() - qStart) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [qStart]);

  const submit = React.useCallback((secs: number) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(answersRef.current, secs);
  }, [onSubmit]);

  // Initialize ordering answers (shuffled indices) the first time we see each ordering question
  React.useEffect(() => {
    const q = questions[idx];
    if (!q) return;
    if (q.type === "ordering" && answers[q.id] == null) {
      const initial = seededShuffle(
        q.options_en.map((_, i) => i),
        q.id,
      );
      setAnswers((prev) => ({ ...prev, [q.id]: initial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, questions]);

  React.useEffect(() => {
    if (qElapsed < perQ) return;
    const q = questions[idx];
    if (!q) return;
    if (instantFeedback && !revealed[q.id]) {
      setRevealed((prev) => ({ ...prev, [q.id]: true }));
      return;
    }
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      setQStart(Date.now());
      setQElapsed(0);
    } else {
      submit(elapsed);
    }
  }, [qElapsed, perQ, idx, questions, instantFeedback, revealed, elapsed, submit]);

  if (questions.length === 0) return <Card className="p-8 text-center">{t("quiz.noQuestions")}</Card>;

  const q = questions[idx];
  const options = isBn ? q.options_bn : q.options_en;
  const ans = answers[q.id];
  const reveal = !!revealed[q.id];
  const explanation = isBn ? q.explanation_bn : q.explanation_en;
  const hint = isBn ? q.hint_bn : q.hint_en;
  const answered = isAnswered(q.type, ans);

  const setAnswer = (a: Answer) => setAnswers((prev) => ({ ...prev, [q.id]: a }));

  const next = () => {
    if (instantFeedback && !reveal && answered) {
      setRevealed({ ...revealed, [q.id]: true });
      return;
    }
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      setQStart(Date.now());
      setQElapsed(0);
    } else {
      submit(elapsed);
    }
  };

  const remaining = Math.max(0, perQ - qElapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const typeLabel: Record<string, string> = {
    single: t("quiz.singleHint"),
    multi: t("quiz.multiHint"),
    true_false: t("quiz.trueFalseHint", { defaultValue: "Choose True or False" }),
    fill_blank: t("quiz.fillBlankHint", { defaultValue: "Type the answer" }),
    ordering: t("quiz.orderingHint", { defaultValue: "Reorder the items into the correct sequence" }),
  };

  return (
    <Card className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {t("quiz.questionN", { n: idx + 1, total: questions.length })}
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium",
            remaining <= 5 ? "text-rose-600" : "text-foreground",
          )}
        >
          <Clock className="h-4 w-4 text-primary" />
          {mm}:{ss}
        </div>
      </div>
      <Progress value={((idx + 1) / questions.length) * 100} className="mb-5 h-1.5" />

      {blurCount > 0 && (
        <div className="mb-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2 text-xs">
          {t("quiz.blurWarning", { n: blurCount })}
        </div>
      )}

      <h2 className="text-lg font-semibold text-foreground mb-3">{isBn ? q.text_bn : q.text_en}</h2>

      {q.image_url && (
        <img
          src={q.image_url}
          alt=""
          className="rounded-xl border border-border max-h-72 w-full object-contain bg-muted/40 mb-4"
        />
      )}

      {/* INPUT BY TYPE */}
      {(q.type === "single" || q.type === "multi" || q.type === "true_false") && (
        <ChoiceInput
          options={options}
          type={q.type}
          selected={Array.isArray(ans) ? ans : []}
          correct={q.correct_indices ?? []}
          reveal={reveal}
          onChange={(arr) => setAnswer(arr)}
        />
      )}

      {q.type === "fill_blank" && (
        <FillBlankInput
          value={typeof ans === "string" ? ans : ""}
          accepted={q.correct_text ?? []}
          reveal={reveal}
          onChange={(v) => setAnswer(v)}
          placeholder={t("quiz.fillBlankPlaceholder", { defaultValue: "Your answer…" })}
        />
      )}

      {q.type === "ordering" && (
        <OrderingInput
          options={options}
          orderIndices={Array.isArray(ans) ? ans : q.options_en.map((_, i) => i)}
          correctOrder={q.correct_order ?? []}
          reveal={reveal}
          onChange={(arr) => setAnswer(arr)}
        />
      )}

      {/* HINT */}
      {hint && !reveal && (
        <div className="mt-3">
          {hintShown[q.id] ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm flex gap-2 text-amber-800 dark:text-amber-200">
              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{hint}</div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setHintShown((p) => ({ ...p, [q.id]: true }))}
              className="text-xs inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 hover:underline"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              {t("quiz.showHint", { defaultValue: "Show hint" })}
            </button>
          )}
        </div>
      )}

      {reveal && explanation && (
        <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-foreground flex gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-primary mb-0.5">{t("quiz.explanation")}</div>
            {explanation}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-6 gap-3">
        <span className="text-xs text-muted-foreground">{typeLabel[q.type] ?? ""}</span>
        <Button onClick={next} disabled={!answered && !reveal}>
          {idx === questions.length - 1 && (reveal || !instantFeedback) ? t("quiz.finish") : t("quiz.next")}
        </Button>
      </div>
    </Card>
  );
}

function ChoiceInput({
  options, type, selected, correct, reveal, onChange,
}: {
  options: string[];
  type: string;
  selected: number[];
  correct: number[];
  reveal: boolean;
  onChange: (a: number[]) => void;
}) {
  const toggle = (i: number) => {
    if (reveal) return;
    if (type === "multi") {
      onChange(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i].sort());
    } else {
      onChange([i]);
    }
  };
  return (
    <div className="space-y-2">
      {options.map((opt, i) => {
        const isSel = selected.includes(i);
        const isCorrect = reveal && correct.includes(i);
        const isWrongPick = reveal && isSel && !correct.includes(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            disabled={reveal}
            className={cn(
              "w-full text-left rounded-xl border-2 px-4 py-3 transition-all flex items-center gap-3",
              isSel && !reveal ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              isCorrect && "border-emerald-500 bg-emerald-500/10",
              isWrongPick && "border-rose-500 bg-rose-500/10",
            )}
          >
            <span
              className={cn(
                "h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                isSel && !reveal ? "border-primary text-primary" : "border-border text-muted-foreground",
                isCorrect && "border-emerald-500 text-emerald-600 bg-emerald-500/10",
                isWrongPick && "border-rose-500 text-rose-600 bg-rose-500/10",
              )}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1 text-sm text-foreground">{opt}</span>
            {reveal && isCorrect && <Check className="h-4 w-4 text-emerald-600" />}
            {reveal && isWrongPick && <X className="h-4 w-4 text-rose-600" />}
          </button>
        );
      })}
    </div>
  );
}

function FillBlankInput({
  value, accepted, reveal, onChange, placeholder,
}: {
  value: string;
  accepted: string[];
  reveal: boolean;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const isCorrect =
    reveal && accepted.some((a) => a.trim().toLowerCase() === value.trim().toLowerCase());
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={reveal}
        className={cn(
          "text-base h-12",
          reveal && isCorrect && "border-emerald-500 bg-emerald-500/10",
          reveal && !isCorrect && "border-rose-500 bg-rose-500/10",
        )}
      />
      {reveal && (
        <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
          <span className="font-medium text-foreground">Accepted:</span>
          {accepted.map((a, i) => (
            <span key={i} className="rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5">
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderingInput({
  options, orderIndices, correctOrder, reveal, onChange,
}: {
  options: string[];
  orderIndices: number[];
  correctOrder: number[];
  reveal: boolean;
  onChange: (a: number[]) => void;
}) {
  const move = (pos: number, dir: -1 | 1) => {
    if (reveal) return;
    const target = pos + dir;
    if (target < 0 || target >= orderIndices.length) return;
    const next = [...orderIndices];
    [next[pos], next[target]] = [next[target], next[pos]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {orderIndices.map((origIdx, pos) => {
        const correctHere = reveal && correctOrder[pos] === origIdx;
        return (
          <div
            key={`${origIdx}-${pos}`}
            className={cn(
              "rounded-xl border-2 px-3 py-2.5 flex items-center gap-2",
              reveal
                ? correctHere
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-rose-500 bg-rose-500/10"
                : "border-border bg-card",
            )}
          >
            <span className="h-7 w-7 rounded-full bg-muted text-xs font-bold flex items-center justify-center shrink-0">
              {pos + 1}
            </span>
            <span className="flex-1 text-sm text-foreground">{options[origIdx]}</span>
            {!reveal && (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(pos, -1)}
                  disabled={pos === 0}
                  className="h-6 w-6 rounded border border-border hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(pos, 1)}
                  disabled={pos === orderIndices.length - 1}
                  className="h-6 w-6 rounded border border-border hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
