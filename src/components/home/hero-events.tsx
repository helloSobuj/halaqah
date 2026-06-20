import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { DailyHadith } from "@/components/home/daily-hadith";
import { DailyAyat } from "@/components/home/daily-ayat";
import { listEvents } from "@/lib/events.functions";
import { useLanguage } from "@/hooks/use-language";

export function HeroEvents() {
  const { lang } = useLanguage();
  const isBn = lang === "bn";

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
      <div className="px-4 lg:px-8 pt-8 pb-16 lg:pb-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
          {/* Event banner — 3 cols */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <Skeleton className="h-[360px] lg:h-[440px] w-full rounded-xl" />
            ) : !events.length ? (
              <Card className="h-[360px] lg:h-[440px] flex flex-col items-center justify-center text-muted-foreground">
                <Calendar className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">
                  {isBn ? "কোনো আসন্ন ইভেন্ট নেই।" : "No upcoming events."}
                </p>
              </Card>
            ) : (
              <Carousel opts={{ loop: events.length > 1, align: "start" }} className="relative">
                <CarouselContent>
                  {events.map((e: any) => {
                    const title = isBn && e.title_bn ? e.title_bn : e.title_en;
                    return (
                      <CarouselItem key={e.id} className="basis-full">
                        <Link
                          to="/events/$slug"
                          params={{ slug: e.slug }}
                          className="block group"
                        >
                          <Card className="overflow-hidden border-border hover:border-primary/40 hover:shadow-elegant transition-all">
                            <div className="relative aspect-[16/9] lg:aspect-[16/8] bg-muted overflow-hidden">
                              {e.cover_image_url ? (
                                <img
                                  src={e.cover_image_url}
                                  alt={title}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                                  <Calendar className="h-16 w-16 text-primary/40" />
                                </div>
                              )}
                              {e.is_featured && (
                                <Badge className="absolute top-3 right-3" variant="default">
                                  {isBn ? "ফিচার্ড" : "Featured"}
                                </Badge>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 lg:p-6">
                                <h2 className="text-white text-lg lg:text-2xl font-bold line-clamp-2 drop-shadow">
                                  {title}
                                </h2>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </CarouselItem>
                    );
                  })}
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

          {/* Right column — 2 rows: Hadith + Ayat */}
          <div className="lg:col-span-1 grid grid-cols-1 gap-5">
            <DailyHadith />
            <DailyAyat />
          </div>
        </div>
      </div>
    </section>
  );
}
