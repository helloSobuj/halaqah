import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  HelpCircle,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { listQuestions } from "@/lib/qa.functions";
import { listTopContributors } from "@/lib/community.functions";
import { useLanguage } from "@/hooks/use-language";

const MEDAL = ["🥇", "🥈", "🥉"];

export function QaRow() {
  const isBn = useLanguage().lang === "bn";

  const qFn = useServerFn(listQuestions);
  const qs = useQuery({
    queryKey: ["home-qa-row"],
    queryFn: () => qFn({ data: { tab: "trending", limit: 6 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const items = qs.data ?? [];

  const cFn = useServerFn(listTopContributors);
  const cs = useQuery({
    queryKey: ["home-qa-contrib"],
    queryFn: () => cFn({ data: { limit: 6 } }),
    staleTime: 10 * 60_000,
  });
  const contribs = cs.data ?? [];

  return (
    <section className="px-4 lg:px-8 pb-10 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Recent questions — 2 cols */}
        <Card className="lg:col-span-2 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-amber-600" />
              {isBn ? "সাম্প্রতিক প্রশ্ন" : "Recent questions"}
            </h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/qa">
                {isBn ? "সব দেখুন" : "See all"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {qs.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : !items.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {isBn ? "কোনো প্রশ্ন নেই।" : "No questions yet."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {items.map((q: any) => (
                <Link
                  key={q.id}
                  to="/qa/$questionId"
                  params={{ questionId: q.id }}
                  className="block group"
                >
                  <div className="rounded-lg p-2.5 hover:bg-accent/40 transition-colors flex items-start gap-3">
                    <div className="flex flex-col items-center text-center flex-shrink-0 min-w-[2.5rem]">
                      <span className="text-base font-bold text-foreground">{q.voteScore ?? 0}</span>
                      <span className="text-[9px] text-muted-foreground uppercase">votes</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {q.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          {q.accepted ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <MessageSquare className="h-3 w-3" />
                          )}
                          {q.answerCount} {isBn ? "উত্তর" : "answers"}
                        </span>
                        {q.category && (
                          <span className="text-primary">
                            {isBn ? q.category.name_bn : q.category.name_en}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Top contributors — 1 col */}
        <Card className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              {isBn ? "শীর্ষ অবদানকারী" : "Top contributors"}
            </h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/qa/leaderboard">
                {isBn ? "সব দেখুন" : "See all"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {cs.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : !contribs.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {isBn ? "কোনো অবদানকারী নেই" : "No contributors yet"}
            </p>
          ) : (
            <ol className="space-y-1.5">
              {contribs.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-accent/40 transition-colors"
                >
                  <span className="w-5 text-center text-sm">{MEDAL[i] ?? `#${i + 1}`}</span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(p.display_name ?? "?").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground truncate flex-1">
                    {p.display_name ?? "Anonymous"}
                  </span>
                  <span className="text-xs font-semibold text-primary">{p.qa_reputation ?? 0}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </section>
  );
}
