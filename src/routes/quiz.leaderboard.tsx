import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable, type LeaderRow } from "@/components/quiz/leaderboard-table";
import { getLeaderboard, listCategories } from "@/lib/quiz.functions";

const search = z.object({
  quizId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/quiz/leaderboard")({
  validateSearch: (s) => search.parse(s),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const sp = Route.useSearch();
  const [period, setPeriod] = React.useState<"all" | "week" | "month">("all");
  const [catId, setCatId] = React.useState<string | undefined>(sp.categoryId);

  const lbFn = useServerFn(getLeaderboard);
  const catsFn = useServerFn(listCategories);

  const cats = useQuery({ queryKey: ["quiz-categories"], queryFn: () => catsFn() });
  const lb = useQuery({
    queryKey: ["leaderboard", sp.quizId ?? null, catId ?? null, period],
    queryFn: () =>
      lbFn({
        data: { quizId: sp.quizId ?? null, categoryId: catId ?? null, period },
      }),
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("quiz.leaderboard")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("quiz.leaderboardDesc")}</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as "all" | "week" | "month")}>
            <TabsList>
              <TabsTrigger value="all">{t("quiz.allTime")}</TabsTrigger>
              <TabsTrigger value="month">{t("quiz.thisMonth")}</TabsTrigger>
              <TabsTrigger value="week">{t("quiz.thisWeek")}</TabsTrigger>
            </TabsList>
          </Tabs>

          {!sp.quizId && cats.data && (
            <select
              value={catId ?? ""}
              onChange={(e) => setCatId(e.target.value || undefined)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("quiz.allCategories")}</option>
              {cats.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {isBn ? c.name_bn : c.name_en}
                </option>
              ))}
            </select>
          )}
        </div>

        <Card className="overflow-hidden">
          {lb.isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <LeaderboardTable rows={(lb.data ?? []) as LeaderRow[]} />
          )}
        </Card>
      </div>
    </AppShell>
  );
}
