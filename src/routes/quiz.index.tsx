import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Trophy, Sparkles, BookOpen, Bookmark, History } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuizCard } from "@/components/quiz/quiz-card";
import { listCategories, listQuizzes } from "@/lib/quiz.functions";

export const Route = createFileRoute("/quiz/")({
  head: () => ({
    meta: [
      { title: "Quiz — Halaqah" },
      { name: "description", content: "Test and grow your Islamic knowledge with timed quizzes." },
    ],
  }),
  component: QuizHome,
});

function QuizHome() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const categoriesFn = useServerFn(listCategories);
  const quizzesFn = useServerFn(listQuizzes);

  const cats = useQuery({ queryKey: ["quiz-categories"], queryFn: () => categoriesFn() });
  const quizzes = useQuery({
    queryKey: ["quizzes", "all"],
    queryFn: () => quizzesFn({ data: { publishedOnly: true } }),
  });

  const featured = quizzes.data?.[0];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-8">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              {t("modules.quiz.title")}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">{t("modules.quiz.desc")}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/quiz/my-attempts"><History className="h-4 w-4 mr-1.5" />{t("quiz.myAttempts", { defaultValue: "My attempts" })}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/quiz/bookmarks"><Bookmark className="h-4 w-4 mr-1.5" />{t("quiz.bookmarks", { defaultValue: "Bookmarks" })}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/quiz/leaderboard"><Trophy className="h-4 w-4 mr-1.5" />{t("quiz.leaderboard")}</Link>
            </Button>
          </div>
        </div>

        {featured && (
          <Card className="p-6 lg:p-8 shadow-elegant overflow-hidden relative">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                  {t("quiz.featured")}
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-foreground line-clamp-1">
                  {isBn ? featured.title_bn : featured.title_en}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {isBn ? featured.description_bn : featured.description_en}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild>
                  <Link to="/quiz/play/$quizId" params={{ quizId: featured.id }}>
                    {t("quiz.start")}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/quiz/leaderboard">
                    <Trophy className="h-4 w-4 mr-2" />
                    {t("quiz.leaderboard")}
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        )}

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t("quiz.categories")}</h2>
          {cats.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {cats.data?.map((c) => (
                <Link
                  key={c.id}
                  to="/quiz/$category"
                  params={{ category: c.slug }}
                  className="group rounded-2xl border border-border p-5 hover:border-primary/40 hover:shadow-elegant transition-all bg-card"
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: (c.color ?? "var(--primary)") + "22", color: c.color ?? undefined }}
                  >
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-foreground">{isBn ? c.name_bn : c.name_en}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t("quiz.allQuizzes")}</h2>
          {quizzes.isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : quizzes.data && quizzes.data.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.data.map((q) => (
                <QuizCard key={q.id} quiz={q} />
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center text-sm text-muted-foreground">{t("quiz.empty")}</Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
