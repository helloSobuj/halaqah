import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X, Info } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAttemptReview } from "@/lib/quiz.functions";

export const Route = createFileRoute("/quiz/review/$attemptId")({
  component: ReviewPage,
});

type Q = {
  id: string;
  type: string;
  text_en: string;
  text_bn: string;
  options_en: string[];
  options_bn: string[];
  correct_indices: number[];
  correct_text: string[];
  correct_order: number[];
  image_url: string | null;
  hint_en: string | null;
  hint_bn: string | null;
  explanation_en: string | null;
  explanation_bn: string | null;
};

function ReviewPage() {
  const { attemptId } = Route.useParams();
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const fn = useServerFn(getAttemptReview);

  const q = useQuery({
    queryKey: ["quiz-review", attemptId],
    queryFn: () => fn({ data: { attemptId } }),
    retry: false,
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Link to="/quiz/my-attempts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("quiz.myAttempts")}
        </Link>

        {q.isLoading && <Skeleton className="h-64 w-full" />}
        {q.isError && (
          <Card className="p-6 text-center text-sm text-rose-600">{(q.error as Error).message}</Card>
        )}

        {q.data && (
          <>
            <Card className="p-6">
              <h1 className="text-xl font-bold text-foreground">
                {isBn ? q.data.quiz?.title_bn : q.data.quiz?.title_en}
              </h1>
              <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                <Stat label={t("quiz.score")} value={`${q.data.attempt.score}/${q.data.attempt.total}`} />
                <Stat label={t("quiz.points")} value={`+${q.data.attempt.points_awarded}`} />
                <Stat label={t("quiz.time")} value={`${Math.floor(q.data.attempt.time_taken_seconds / 60)}m ${q.data.attempt.time_taken_seconds % 60}s`} />
              </div>
            </Card>

            <div className="space-y-4">
              {(q.data.questions as Q[]).map((qq, i) => {
                const userAns = ((q.data.attempt.answers as Record<string, number[] | string>) ?? {})[qq.id];
                const explanation = isBn ? qq.explanation_bn : qq.explanation_en;
                const isCorrect = computeCorrect(qq, userAns);
                return (
                  <Card key={qq.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        "shrink-0 h-7 w-7 rounded-full text-xs font-bold inline-flex items-center justify-center",
                        isCorrect ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{isBn ? qq.text_bn : qq.text_en}</h3>
                        {qq.image_url && (
                          <img src={qq.image_url} alt="" className="mt-3 max-h-56 rounded-lg border border-border object-contain bg-muted/40" />
                        )}
                        <div className="mt-3">
                          <ReviewBody question={qq} userAns={userAns} isBn={isBn} />
                        </div>
                        {explanation && (
                          <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm flex gap-2">
                            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-primary mb-0.5">{t("quiz.explanation")}</div>
                              {explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-center pt-4">
              <Button asChild variant="outline">
                <Link to="/quiz">{t("quiz.allQuizzes")}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function computeCorrect(q: Q, ans: number[] | string | undefined): boolean {
  if (q.type === "fill_blank") {
    if (typeof ans !== "string") return false;
    const v = ans.trim().toLowerCase();
    return q.correct_text.some((c) => c.trim().toLowerCase() === v);
  }
  if (q.type === "ordering") {
    if (!Array.isArray(ans)) return false;
    if (ans.length !== q.correct_order.length) return false;
    return ans.every((v, i) => v === q.correct_order[i]);
  }
  if (!Array.isArray(ans)) return false;
  return [...ans].sort().join(",") === [...q.correct_indices].sort().join(",");
}

function ReviewBody({ question, userAns, isBn }: { question: Q; userAns: number[] | string | undefined; isBn: boolean }) {
  const opts = isBn ? question.options_bn : question.options_en;

  if (question.type === "fill_blank") {
    const userText = typeof userAns === "string" ? userAns : "";
    return (
      <div className="space-y-1.5 text-sm">
        <div className="rounded-lg border-2 border-rose-500/40 bg-rose-500/5 px-3 py-2">
          <span className="text-xs text-muted-foreground mr-2">Your answer:</span>
          <span className="font-medium">{userText || <em className="text-muted-foreground">no answer</em>}</span>
        </div>
        <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
          <span className="text-xs text-muted-foreground mr-2">Accepted:</span>
          <span className="font-medium">{question.correct_text.join(", ")}</span>
        </div>
      </div>
    );
  }

  if (question.type === "ordering") {
    const userOrder = Array.isArray(userAns) ? userAns : [];
    return (
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Your order</div>
          <ol className="space-y-1">
            {userOrder.map((origIdx, pos) => {
              const right = question.correct_order[pos] === origIdx;
              return (
                <li key={pos} className={cn("rounded border-2 px-2 py-1.5", right ? "border-emerald-500 bg-emerald-500/10" : "border-rose-500 bg-rose-500/10")}>
                  {pos + 1}. {opts[origIdx]}
                </li>
              );
            })}
          </ol>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Correct order</div>
          <ol className="space-y-1">
            {question.correct_order.map((origIdx, pos) => (
              <li key={pos} className="rounded border-2 border-emerald-500 bg-emerald-500/10 px-2 py-1.5">
                {pos + 1}. {opts[origIdx]}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  // single / multi / true_false
  const userArr = Array.isArray(userAns) ? userAns : [];
  return (
    <div className="space-y-1.5">
      {opts.map((o, idx) => {
        const isUser = userArr.includes(idx);
        const isRight = question.correct_indices.includes(idx);
        return (
          <div
            key={idx}
            className={cn(
              "rounded-lg border-2 px-3 py-2 text-sm flex items-center gap-2",
              isRight && "border-emerald-500 bg-emerald-500/10",
              isUser && !isRight && "border-rose-500 bg-rose-500/10",
              !isRight && !isUser && "border-border",
            )}
          >
            <span className="font-bold w-5 text-muted-foreground">{String.fromCharCode(65 + idx)}</span>
            <span className="flex-1">{o}</span>
            {isRight && <Check className="h-4 w-4 text-emerald-600" />}
            {isUser && !isRight && <X className="h-4 w-4 text-rose-600" />}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="text-base font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
