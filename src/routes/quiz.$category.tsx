import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QuizCard } from "@/components/quiz/quiz-card";
import { listCategories, listQuizzes } from "@/lib/quiz.functions";

export const Route = createFileRoute("/quiz/$category")({
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";

  const categoriesFn = useServerFn(listCategories);
  const quizzesFn = useServerFn(listQuizzes);

  const cats = useQuery({ queryKey: ["quiz-categories"], queryFn: () => categoriesFn() });
  const quizzes = useQuery({
    queryKey: ["quizzes", category],
    queryFn: () => quizzesFn({ data: { categorySlug: category, publishedOnly: true } }),
  });

  const cat = cats.data?.find((c) => c.slug === category);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <Link to="/quiz" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("quiz.allQuizzes")}
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {cat ? (isBn ? cat.name_bn : cat.name_en) : category}
          </h1>
        </div>

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
      </div>
    </AppShell>
  );
}
