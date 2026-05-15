import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QuizCard } from "@/components/quiz/quiz-card";
import { listBookmarks, toggleBookmark } from "@/lib/quiz.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/quiz/bookmarks")({
  head: () => ({ meta: [{ title: "Bookmarks — Halaqah Quiz" }] }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listBookmarks);
  const toggleFn = useServerFn(toggleBookmark);

  React.useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  const q = useQuery({
    queryKey: ["my-bookmarks"],
    enabled: !!user,
    queryFn: () => listFn(),
  });

  const tm = useMutation({
    mutationFn: (quizId: string) => toggleFn({ data: { quizId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-bookmarks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t("quiz.bookmarks", { defaultValue: "Bookmarks" })}</h1>
        </div>

        {q.isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        )}

        {q.data && q.data.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            {t("quiz.noBookmarks", { defaultValue: "You haven't bookmarked any quizzes yet." })}
          </Card>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {q.data?.map((b) => {
            const quiz = (b as { quizzes?: Parameters<typeof QuizCard>[0]["quiz"] }).quizzes;
            if (!quiz) return null;
            return (
              <QuizCard
                key={b.quiz_id}
                quiz={quiz}
                bookmarked
                onToggleBookmark={() => tm.mutate(b.quiz_id)}
              />
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
