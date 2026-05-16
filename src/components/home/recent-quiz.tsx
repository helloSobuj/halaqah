import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, ArrowRight, ListChecks, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listQuizzes } from "@/lib/quiz.functions";
import { useLanguage } from "@/hooks/use-language";

export function RecentQuiz() {
  const { lang } = useLanguage();
  const isBn = lang === "bn";
  const fn = useServerFn(listQuizzes);
  const { data, isLoading } = useQuery({
    queryKey: ["home-recent-quiz"],
    queryFn: () => fn({ data: { publishedOnly: true } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const quizzes = (data ?? []).slice(0, 2);

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-600" />
          {isBn ? "নতুন কুইজ" : "Recent quiz"}
        </h3>
        <Link to="/quiz" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          {isBn ? "সব" : "All"} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : !quizzes.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">{isBn ? "কোনো কুইজ নেই।" : "No quizzes yet."}</p>
      ) : (
        <div className="space-y-2 flex-1">
          {quizzes.map((q) => {
            const title = isBn && q.title_bn ? q.title_bn : q.title_en;
            return (
              <Link key={q.id} to="/quiz/play/$quizId" params={{ quizId: q.id }} className="block group">
                <div className="rounded-lg border border-border/60 p-2.5 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                  <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{q.difficulty}</Badge>
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
  );
}
