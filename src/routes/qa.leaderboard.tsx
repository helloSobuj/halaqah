import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { ArrowLeft, Trophy } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getQALeaderboard } from "@/lib/qa.functions";

export const Route = createFileRoute("/qa/leaderboard")({
  head: () => ({ meta: [{ title: "Q&A Leaderboard — Halaqah" }] }),
  component: QALeaderboard,
});

function QALeaderboard() {
  const [period, setPeriod] = React.useState<"week" | "month" | "all">("week");
  const fn = useServerFn(getQALeaderboard);
  const q = useQuery({
    queryKey: ["qa-leaderboard", period],
    queryFn: () => fn({ data: { period } }),
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-4">
        <Link to="/qa" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Q&amp;A
        </Link>
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl lg:text-3xl font-bold">Q&amp;A Leaderboard</h1>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="month">This month</TabsTrigger>
            <TabsTrigger value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="overflow-hidden">
          {q.isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !q.data?.length ? (
            <div className="p-8 text-center text-muted-foreground">No activity yet.</div>
          ) : (
            <div className="divide-y">
              {q.data.map((row: any, i: number) => (
                <div key={row.user_id} className="flex items-center gap-3 p-3">
                  <span className="w-6 text-center font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={row.avatar_url ?? undefined} />
                    <AvatarFallback>{(row.display_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.display_name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.answers} answers · {row.accepted} accepted · {row.total_rep} total rep
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary tabular-nums">+{row.rep_gained}</p>
                    <p className="text-xs text-muted-foreground">rep</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
