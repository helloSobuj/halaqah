import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Trophy, Users, CalendarClock } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listTournaments } from "@/lib/tournament.functions";
import { formatInTz } from "@/lib/timezone";

export const Route = createFileRoute("/tournaments/")({
  head: () => ({
    meta: [
      { title: "Tournaments — Halaqah" },
      { name: "description", content: "Compete in single-quiz bracket tournaments." },
    ],
  }),
  component: TournamentsIndex,
});

const STATUS_TONE: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  finished: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function TournamentsIndex() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const fn = useServerFn(listTournaments);
  const q = useQuery({ queryKey: ["tournaments"], queryFn: () => fn() });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            {t("tournaments.title", { defaultValue: "Tournaments" })}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("tournaments.desc", { defaultValue: "Single-quiz bracket competitions. Outscore your opponent to advance." })}
          </p>
        </div>

        {q.isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        )}
        {q.data && q.data.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            {t("tournaments.empty", { defaultValue: "No tournaments scheduled yet." })}
          </Card>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(q.data ?? []).map((t: any) => {
            const name = isBn ? t.name_bn : t.name_en;
            const tz = t.quizzes?.timezone || "UTC";
            return (
              <Card key={t.id} className="p-5 hover:border-primary/40 hover:shadow-elegant transition-all">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground line-clamp-2">{name}</h3>
                  <Badge className={STATUS_TONE[t.status] ?? ""}>{t.status}</Badge>
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    {formatInTz(t.starts_at, tz, isBn ? "bn-BD" : "en-US")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {t.participant_count} / {t.bracket_size}
                  </div>
                </div>
                <Button asChild className="mt-4 w-full" size="sm">
                  <Link to="/tournaments/$id" params={{ id: t.id }}>
                    {t.status === "open" ? "Register" : "View bracket"}
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
