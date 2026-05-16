import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { HelpCircle, ArrowRight, MessageSquare, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listQuestions } from "@/lib/qa.functions";
import { useLanguage } from "@/hooks/use-language";

export function RecentQA() {
  const { lang } = useLanguage();
  const isBn = lang === "bn";
  const fn = useServerFn(listQuestions);
  const { data, isLoading } = useQuery({
    queryKey: ["home-recent-qa"],
    queryFn: () => fn({ data: { tab: "trending", limit: 4 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const items = data ?? [];

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-600" />
          {isBn ? "জনপ্রিয় প্রশ্ন" : "Trending Q&A"}
        </h3>
        <Link to="/qa" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          {isBn ? "সব" : "All"} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !items.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">{isBn ? "কোনো প্রশ্ন নেই।" : "No questions yet."}</p>
      ) : (
        <div className="space-y-1.5 flex-1">
          {items.map((q: any) => (
            <Link key={q.id} to="/qa/$questionId" params={{ questionId: q.id }} className="block group">
              <div className="rounded-lg p-2 hover:bg-accent/40 transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center text-center flex-shrink-0 min-w-[2.5rem]">
                    <span className="text-sm font-bold text-foreground">{q.voteScore ?? 0}</span>
                    <span className="text-[9px] text-muted-foreground uppercase">votes</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{q.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {q.accepted ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <MessageSquare className="h-3 w-3" />}
                        {q.answerCount} {isBn ? "উত্তর" : "answers"}
                      </span>
                      {q.category && <span className="text-primary">{isBn ? q.category.name_bn : q.category.name_en}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
