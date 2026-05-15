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
          <ArrowLeft className="h-4 w-4" /> {t("quiz.myAttempts", { defaultValue: "My attempts" })}
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
                <Stat label={t("quiz.score", { defaultValue: "Score" })} value={`${q.data.attempt.score}/${q.data.attempt.total}`} />
                <Stat label={t("quiz.points")} value={`+${q.data.attempt.points_awarded}`} />
                <Stat label={t("quiz.time", { defaultValue: "Time" })} value={`${Math.floor(q.data.attempt.time_taken_seconds / 60)}m ${q.data.attempt.time_taken_seconds % 60}s`} />
              </div>
            </Card>

            <div className="space-y-4">
              {(q.data.questions as Q[]).map((qq, i) => {
                const userAns = ((q.data.attempt.answers as Record<string, number[]>) ?? {})[qq.id] ?? [];
                const correct = qq.correct_indices ?? [];
                const opts = isBn ? qq.options_bn : qq.options_en;
                const explanation = isBn ? qq.explanation_bn : qq.explanation_en;
                const isCorrect =
                  [...userAns].sort().join(",") === [...correct].sort().join(",");
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
                        <div className="mt-3 space-y-1.5">
                          {opts.map((o, idx) => {
                            const isUser = userAns.includes(idx);
                            const isRight = correct.includes(idx);
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
                        {explanation && (
                          <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm flex gap-2">
                            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-primary mb-0.5">{t("quiz.explanation", { defaultValue: "Explanation" })}</div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="text-base font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
