import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, ArrowRight, MapPin, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listEvents } from "@/lib/events.functions";
import { useLanguage } from "@/hooks/use-language";

export function RecentEvent() {
  const { lang } = useLanguage();
  const isBn = lang === "bn";
  const fn = useServerFn(listEvents);
  const { data, isLoading } = useQuery({
    queryKey: ["home-recent-events"],
    queryFn: () => fn({ data: { filter: "upcoming", limit: 2 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const events = data ?? [];

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-sky-600" />
          {isBn ? "আসন্ন ইভেন্ট" : "Upcoming events"}
        </h3>
        <Link to="/events" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          {isBn ? "সব" : "All"} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : !events.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">{isBn ? "কোনো ইভেন্ট নেই।" : "No upcoming events."}</p>
      ) : (
        <div className="space-y-2 flex-1">
          {events.map((e: any) => {
            const title = isBn && e.title_bn ? e.title_bn : e.title_en;
            const date = new Date(e.starts_at);
            const day = date.toLocaleDateString(isBn ? "bn-BD" : "en-US", { day: "numeric" });
            const month = date.toLocaleDateString(isBn ? "bn-BD" : "en-US", { month: "short" });
            return (
              <Link key={e.id} to="/events/$slug" params={{ slug: e.slug }} className="block group">
                <div className="rounded-lg border border-border/60 p-2.5 hover:border-primary/40 hover:bg-accent/30 transition-colors flex items-start gap-2.5">
                  <div className="text-center bg-primary/10 rounded-md px-2 py-1 flex-shrink-0">
                    <div className="text-[9px] uppercase text-muted-foreground font-medium leading-none">{month}</div>
                    <div className="text-base font-bold text-primary leading-tight" suppressHydrationWarning>{day}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{title}</p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                      {e.mode === "online" ? <><Globe className="h-3 w-3" /> Online</> : e.venue ? <><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{e.venue}</span></> : null}
                    </div>
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
