import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { PenSquare, Trophy, Search, Flame } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { listQuestions, listQACategories, getDailyQuests } from "@/lib/qa.functions";
import { QuestionRow } from "@/components/qa/qa-shared";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/qa")({
  head: () => ({
    meta: [
      { title: "Q&A — Halaqah" },
      { name: "description", content: "Ask Islamic questions and learn from peers and verified scholars." },
    ],
  }),
  component: QAFeed,
});

function QAFeed() {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<"new" | "unanswered" | "trending" | "top">("new");
  const [q, setQ] = React.useState("");
  const [categorySlug, setCategorySlug] = React.useState<string | undefined>(undefined);

  const listFn = useServerFn(listQuestions);
  const catsFn = useServerFn(listQACategories);
  const questsFn = useServerFn(getDailyQuests);

  const cats = useQuery({ queryKey: ["qa-cats"], queryFn: () => catsFn() });
  const list = useQuery({
    queryKey: ["qa-list", tab, categorySlug, q],
    queryFn: () => listFn({ data: { tab, categorySlug, q: q || undefined } }),
  });
  const quests = useQuery({
    queryKey: ["qa-daily-quests"],
    queryFn: () => questsFn(),
    enabled: !!user,
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Q&amp;A</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Ask questions about Islam, share knowledge, and earn reputation.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/qa/leaderboard"><Trophy className="h-4 w-4 mr-1.5" />Leaderboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/qa/ask"><PenSquare className="h-4 w-4 mr-1.5" />Ask question</Link>
            </Button>
          </div>
        </div>

        {user && quests.data && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-sm">Today's goals</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <QuestProgress label="Ask 1 question" cur={quests.data.asked} goal={quests.data.goals.ask} />
              <QuestProgress label="Answer 1 question" cur={quests.data.answered} goal={quests.data.goals.answer} />
              <QuestProgress label="Upvote 3 helpful answers" cur={quests.data.upvoted} goal={quests.data.goals.upvote} />
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-[1fr_240px] gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search questions…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="new">Newest</TabsTrigger>
                <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
                <TabsTrigger value="trending">Trending</TabsTrigger>
                <TabsTrigger value="top">Top</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} className="space-y-3 mt-4">
                {list.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
                ) : !list.data?.length ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    No questions yet. <Link to="/qa/ask" className="text-primary underline">Be the first to ask</Link>.
                  </Card>
                ) : (
                  list.data.map((qq: any) => <QuestionRow key={qq.id} q={qq} />)
                )}
              </TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-2">Categories</h3>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={!categorySlug ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setCategorySlug(undefined)}
                >
                  All
                </Badge>
                {cats.data?.map((c: any) => (
                  <Badge
                    key={c.slug}
                    variant={categorySlug === c.slug ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setCategorySlug(c.slug)}
                  >
                    {c.name_en}
                  </Badge>
                ))}
              </div>
            </Card>
            <Card className="p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground text-sm">How it works</p>
              <p>Earn reputation when your questions and answers are upvoted.</p>
              <p>Get +25 when your answer is accepted, +50 when a scholar endorses it.</p>
              <p>Need 15 reputation to downvote.</p>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function QuestProgress({ label, cur, goal }: { label: string; cur: number; goal: number }) {
  const pct = Math.min(100, (cur / goal) * 100);
  const done = cur >= goal;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={done ? "text-emerald-600 font-medium" : ""}>{label}</span>
        <span className="tabular-nums">{Math.min(cur, goal)}/{goal}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={done ? "h-full bg-emerald-500" : "h-full bg-primary"} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
