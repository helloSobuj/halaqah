import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  ArrowRight,
  Clock,
  ListChecks,
  Medal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { listQuizzes, getLeaderboard } from "@/lib/quiz.functions";
import { useLanguage } from "@/hooks/use-language";

const MEDAL = ["🥇", "🥈", "🥉"];

export function QuizRow() {
  const isBn = useLanguage().lang === "bn";

  const qFn = useServerFn(listQuizzes);
  const qs = useQuery({
    queryKey: ["home-quiz-row"],
    queryFn: () => qFn({ data: { publishedOnly: true } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const quizzes = (qs.data ?? []).slice(0, 5);

  const lFn = useServerFn(getLeaderboard);
  const lb = useQuery({
    queryKey: ["home-quiz-lb"],
    queryFn: () => lFn({ data: { period: "all" } }),
    staleTime: 10 * 60_000,
  });
  const top = (lb.data ?? []).slice(0, 6);

  return (
    <section className="px-4 lg:px-8 pb-10 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Recent quiz — 2 cols */}
        <Card className="lg:col-span-2 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              {isBn ? "সাম্প্রতিক কুইজ" : "Recent quiz"}
            </h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/quiz">
                {isBn ? "সব দেখুন" : "See all"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {qs.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !quizzes.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {isBn ? "কোনো কুইজ নেই।" : "No quizzes yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {quizzes.map((q: any) => {
                const title = isBn && q.title_bn ? q.title_bn : q.title_en;
                return (
                  <Link
                    key={q.id}
                    to="/quiz/play/$quizId"
                    params={{ quizId: q.id }}
                    className="block group"
                  >
                    <div className="rounded-lg border border-border/60 p-3 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {q.difficulty}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <ListChecks className="h-3 w-3" /> {q.question_count ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {Math.round(q.time_limit_seconds / 60)}m
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quiz leaderboard — 1 col */}
        <Card className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Medal className="h-4 w-4 text-emerald-500" />
              {isBn ? "কুইজ লিডারবোর্ড" : "Quiz leaderboard"}
            </h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/quiz/leaderboard">
                {isBn ? "সব দেখুন" : "See all"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {lb.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : !top.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {isBn ? "এখনও কোনো প্রবেশ নেই" : "No entries yet"}
            </p>
          ) : (
            <ol className="space-y-1.5">
              {top.map((r: any, i: number) => (
                <li
                  key={r.user_id}
                  className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-accent/40 transition-colors"
                >
                  <span className="w-5 text-center text-sm">{MEDAL[i] ?? `#${i + 1}`}</span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={r.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(r.display_name ?? "?").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground truncate flex-1">
                    {r.display_name ?? "Anonymous"}
                  </span>
                  <span className="text-xs font-semibold text-primary">{r.total_score ?? 0}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </section>
  );
}
