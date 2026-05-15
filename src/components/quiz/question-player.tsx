import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, Clock } from "lucide-react";

export type PlayQuestion = {
  id: string;
  type: "single" | "multi" | string;
  text_en: string;
  text_bn: string;
  options_en: string[];
  options_bn: string[];
};

export function QuestionPlayer({
  questions,
  timeLimit,
  instantFeedback,
  correctMap, // { [qId]: number[] } only present if instantFeedback
  onSubmit,
}: {
  questions: PlayQuestion[];
  timeLimit: number;
  instantFeedback: boolean;
  correctMap?: Record<string, number[]>;
  onSubmit: (answers: Record<string, number[]>, secs: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const [idx, setIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number[]>>({});
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({});
  const [secs, setSecs] = React.useState(0);
  const startedAt = React.useRef(Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setSecs(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, timeLimit - secs);
  React.useEffect(() => {
    if (timeLimit > 0 && secs >= timeLimit) {
      onSubmit(answers, secs);
    }
  }, [secs, timeLimit, answers, onSubmit]);

  if (questions.length === 0) return <Card className="p-8 text-center">{t("quiz.noQuestions")}</Card>;

  const q = questions[idx];
  const options = isBn ? q.options_bn : q.options_en;
  const sel = answers[q.id] ?? [];
  const reveal = revealed[q.id];
  const correct = correctMap?.[q.id] ?? [];

  const toggle = (i: number) => {
    if (reveal) return;
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      if (q.type === "multi") {
        return { ...prev, [q.id]: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort() };
      }
      return { ...prev, [q.id]: [i] };
    });
  };

  const next = () => {
    if (instantFeedback && !reveal && sel.length > 0) {
      setRevealed({ ...revealed, [q.id]: true });
      return;
    }
    if (idx < questions.length - 1) setIdx(idx + 1);
    else onSubmit(answers, secs);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <Card className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {t("quiz.questionN", { n: idx + 1, total: questions.length })}
        </div>
        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          {mm}:{ss}
        </div>
      </div>
      <Progress value={((idx + 1) / questions.length) * 100} className="mb-5 h-1.5" />

      <h2 className="text-lg font-semibold text-foreground mb-4">{isBn ? q.text_bn : q.text_en}</h2>

      <div className="space-y-2">
        {options.map((opt, i) => {
          const isSel = sel.includes(i);
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
                isSel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                isCorrect && "border-emerald-500 bg-emerald-500/10",
                isWrongPick && "border-rose-500 bg-rose-500/10",
              )}
            >
              <span
                className={cn(
                  "h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                  isSel ? "border-primary text-primary" : "border-border text-muted-foreground",
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

      <div className="flex justify-between items-center mt-6">
        <span className="text-xs text-muted-foreground">
          {q.type === "multi" ? t("quiz.multiHint") : t("quiz.singleHint")}
        </span>
        <Button onClick={next} disabled={sel.length === 0}>
          {idx === questions.length - 1 && (reveal || !instantFeedback) ? t("quiz.finish") : t("quiz.next")}
        </Button>
      </div>
    </Card>
  );
}
