import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Medal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeaderboard } from "@/lib/quiz.functions";
import { useLanguage } from "@/hooks/use-language";

const MEDAL = ["🥇", "🥈", "🥉"];

export function QuizTop() {
  const isBn = useLanguage().lang === "bn";
  const fn = useServerFn(getLeaderboard);
  const { data, isLoading } = useQuery({
    queryKey: ["home-quiz-leaderboard"],
    queryFn: () => fn({ data: { period: "all" } }),
    staleTime: 10 * 60_000,
  });
  const items = (data ?? []).slice(0, 5);

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Medal className="h-4 w-4 text-emerald-500" />
          {isBn ? "কুইজ লিডারবোর্ড" : "Quiz Leaderboard"}
        </h3>
        <Button asChild variant="ghost" size="sm">
          <Link to="/quiz/leaderboard">{isBn ? "সব দেখুন" : "See all"}</Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-2 flex-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          {isBn ? "এখনও কোনো প্রবেশ নেই" : "No entries yet"}
        </div>
      ) : (
        <ol className="space-y-1.5 flex-1">
          {items.map((r: any, i: number) => (
            <li key={r.user_id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-accent/40 transition-colors">
              <span className="w-5 text-center text-sm">{MEDAL[i] ?? `#${i + 1}`}</span>
              <Avatar className="h-7 w-7">
                <AvatarImage src={r.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{(r.display_name ?? "?").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground truncate flex-1">{r.display_name ?? "Anonymous"}</span>
              <span className="text-xs font-semibold text-primary">{r.total_score ?? 0}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
