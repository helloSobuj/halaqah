import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as React from "react";
import { History, Eye } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyAttempts } from "@/lib/quiz.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/quiz/my-attempts")({
  head: () => ({ meta: [{ title: "My Attempts — Halaqah Quiz" }] }),
  component: MyAttemptsPage,
});

function MyAttemptsPage() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const { user } = useAuth();
  const navigate = useNavigate();
  const fn = useServerFn(listMyAttempts);

  React.useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  const q = useQuery({
    queryKey: ["my-attempts"],
    enabled: !!user,
    queryFn: () => fn(),
  });

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t("quiz.myAttempts", { defaultValue: "My attempts" })}</h1>
        </div>

        {q.isLoading && <Skeleton className="h-40 w-full" />}
        {q.data && q.data.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            {t("quiz.noAttempts", { defaultValue: "You haven't taken any quizzes yet." })}
          </Card>
        )}

        <div className="space-y-2">
          {q.data?.map((a) => {
            const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
            const quiz = (a as { quizzes?: { title_en: string; title_bn: string } }).quizzes;
            return (
              <Card key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">
                    {isBn ? quiz?.title_bn : quiz?.title_en}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {pct}% • {a.score}/{a.total} • +{a.points_awarded} pts •{" "}
                    {Math.floor(a.time_taken_seconds / 60)}m {a.time_taken_seconds % 60}s
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(a.completed_at).toLocaleString(isBn ? "bn-BD" : "en-US")}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/quiz/review/$attemptId" params={{ attemptId: a.id }}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> {t("quiz.review", { defaultValue: "Review" })}
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
