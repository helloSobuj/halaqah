import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { listTopContributors } from "@/lib/community.functions";
import { useLanguage } from "@/hooks/use-language";

const MEDAL = ["🥇", "🥈", "🥉"];

export function TopContributors() {
  const isBn = useLanguage().lang === "bn";
  const fn = useServerFn(listTopContributors);
  const { data, isLoading } = useQuery({
    queryKey: ["top-contributors"],
    queryFn: () => fn({ data: { limit: 5 } }),
    staleTime: 10 * 60_000,
  });
  const items = data ?? [];
  if (!isLoading && !items.length) return null;

  return (
    <Card className="p-4">
      <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-amber-500" />
        {isBn ? "শীর্ষ অবদানকারী" : "Top contributors"}
      </h3>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <ol className="space-y-1.5">
          {items.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-accent/40 transition-colors">
              <span className="w-5 text-center text-sm">{MEDAL[i] ?? `#${i + 1}`}</span>
              <Avatar className="h-7 w-7">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{(p.display_name ?? "?").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground truncate flex-1">{p.display_name ?? "Anonymous"}</span>
              <span className="text-xs font-semibold text-primary">{p.qa_reputation ?? 0}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
