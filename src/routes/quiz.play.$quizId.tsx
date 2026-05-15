import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionPlayer, type PlayQuestion } from "@/components/quiz/question-player";
import { ResultSummary, type SubmitResult } from "@/components/quiz/result-summary";
import { useAuth } from "@/hooks/use-auth";
import { getQuizForPlay, submitAttempt, attemptsLeft } from "@/lib/quiz.functions";
import { getFingerprint } from "@/lib/fingerprint";

export const Route = createFileRoute("/quiz/play/$quizId")({
  component: PlayPage,
});

function PlayPage() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const navigate = useNavigate();

  const fetchQuiz = useServerFn(getQuizForPlay);
  const submitFn = useServerFn(submitAttempt);
  const attemptsFn = useServerFn(attemptsLeft);

  const [fingerprint, setFingerprint] = React.useState<string | null>(null);
  React.useEffect(() => {
    getFingerprint().then(setFingerprint);
  }, []);

  React.useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  const quiz = useQuery({
    queryKey: ["quiz-play", quizId],
    enabled: !!user,
    queryFn: () => fetchQuiz({ data: { quizId } }),
  });

  const left = useQuery({
    queryKey: ["quiz-attempts-left", quizId, fingerprint],
    enabled: !!user && fingerprint !== null,
    queryFn: () => attemptsFn({ data: { quizId, fingerprint } }),
  });

  const [started, setStarted] = React.useState(false);
  const [result, setResult] = React.useState<SubmitResult | null>(null);
  const [correctMap, setCorrectMap] = React.useState<Record<string, number[]>>({});

  if (!user) return null;

  if (quiz.isLoading || left.isLoading)
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto p-8 space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );

  if (quiz.isError)
    return (
      <AppShell>
        <Card className="max-w-md mx-auto mt-12 p-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
          <h2 className="font-semibold text-foreground">{(quiz.error as Error).message}</h2>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/quiz">{t("quiz.allQuizzes")}</Link>
          </Button>
        </Card>
      </AppShell>
    );

  const q = quiz.data!.quiz;
  const questions = (quiz.data!.questions as PlayQuestion[]) ?? [];
  const remaining = left.data?.left ?? 0;

  if (result) {
    const cat = (q as { quiz_categories?: { slug?: string } }).quiz_categories;
    return (
      <AppShell>
        <div className="px-4 py-10">
          <ResultSummary result={result} quizId={quizId} categorySlug={cat?.slug} />
        </div>
      </AppShell>
    );
  }

  if (!started) {
    const blocked = q.max_attempts > 0 && remaining <= 0;
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-10">
          <Card className="p-6 lg:p-8">
            <h1 className="text-2xl font-bold text-foreground">{isBn ? q.title_bn : q.title_en}</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isBn ? q.description_bn : q.description_en}
            </p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <Stat label={t("quiz.questions")} value={String(questions.length)} />
              <Stat label={t("quiz.timeLimit")} value={`${Math.round(q.time_limit_seconds / 60)}m`} />
              <Stat label={t("quiz.passMark")} value={`${q.pass_mark}%`} />
              <Stat
                label={t("quiz.attemptsLeft")}
                value={q.max_attempts === 0 ? "∞" : String(remaining)}
              />
            </dl>
            {blocked ? (
              <div className="mt-5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 p-3 text-sm">
                {t("quiz.attemptLimitReached")}
              </div>
            ) : (
              <Button className="mt-6 w-full" size="lg" onClick={() => setStarted(true)}>
                {t("quiz.beginQuiz")}
              </Button>
            )}
          </Card>
        </div>
      </AppShell>
    );
  }

  const handleSubmit = async (answers: Record<string, number[]>, secs: number) => {
    try {
      const res = await submitFn({ data: { quizId, answers, timeTaken: secs, fingerprint } });
      const map: Record<string, number[]> = {};
      for (const x of res.questions as { id: string; correct_indices: number[] }[]) {
        map[x.id] = x.correct_indices;
      }
      setCorrectMap(map);
      setResult(res.result as SubmitResult);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppShell>
      <div className="px-4 py-8">
        <QuestionPlayer
          questions={questions}
          timeLimit={q.time_limit_seconds}
          instantFeedback={q.instant_feedback}
          correctMap={Object.keys(correctMap).length ? correctMap : undefined}
          onSubmit={handleSubmit}
        />
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3 text-center">
      <div className="text-base font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
