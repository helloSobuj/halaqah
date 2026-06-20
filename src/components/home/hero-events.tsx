import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Moon, CalendarDays, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { EventCard } from "@/components/events/event-card";
import { DailyHadith } from "@/components/home/daily-hadith";
import { listEvents } from "@/lib/events.functions";
import { useLanguage } from "@/hooks/use-language";
import { formatHijri } from "@/lib/hijri";

export function HeroEvents() {
  const { lang } = useLanguage();
  const isBn = lang === "bn";
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const now = new Date();
  const hijri = mounted ? formatHijri(now, lang) : "";
  const gregorian = mounted
    ? now.toLocaleDateString(isBn ? "bn-BD" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  const fn = useServerFn(listEvents);
  const { data, isLoading } = useQuery({
    queryKey: ["home-hero-events"],
    queryFn: () => fn({ data: { filter: "upcoming", limit: 6 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const events = data ?? [];

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 65%), radial-gradient(50% 50% at 85% 30%, color-mix(in oklab, var(--accent) 35%, transparent), transparent 70%)",
        }}
      />
      <div className="px-4 lg:px-8 pt-8 pb-8 max-w-7xl mx-auto">
        {/* Top greeting strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              {isBn ? "আসসালামু আলাইকুম" : "Assalamu alaikum"}
            </div>
            <h1 className="text-2xl lg:text-4xl font-bold tracking-tight text-foreground">
              {isBn ? "আজকের আয়োজন ও অনুপ্রেরণা" : "Today's events & inspiration"}
            </h1>
          </div>
          {mounted && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur border border-border text-xs font-medium text-foreground">
                <Moon className="h-3.5 w-3.5 text-primary" />
                {hijri}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur border border-border text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {gregorian}
              </span>
            </div>
          )}
        </div>

        {/* 4-col layout: events (3) + hadith (1) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
          <div className="lg:col-span-3">
            {isLoading ? (
              <Skeleton className="h-[340px] w-full rounded-xl" />
            ) : !events.length ? (
              <Card className="h-[340px] flex flex-col items-center justify-center text-muted-foreground">
                <Calendar className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">
                  {isBn ? "কোনো আসন্ন ইভেন্ট নেই।" : "No upcoming events."}
                </p>
              </Card>
            ) : (
              <Carousel opts={{ loop: events.length > 1, align: "start" }} className="relative">
                <CarouselContent>
                  {events.map((e: any) => (
                    <CarouselItem key={e.id} className="basis-full">
                      <EventCard event={e} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {events.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2 h-8 w-8" />
                    <CarouselNext className="right-2 h-8 w-8" />
                  </>
                )}
              </Carousel>
            )}
          </div>
          <div className="lg:col-span-1">
            <DailyHadith />
          </div>
        </div>
      </div>
    </section>
  );
}
