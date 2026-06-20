import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { EventCard } from "@/components/events/event-card";
import { listEvents } from "@/lib/events.functions";
import { useLanguage } from "@/hooks/use-language";

export function EventsRow() {
  const isBn = useLanguage().lang === "bn";
  const fn = useServerFn(listEvents);
  const { data, isLoading } = useQuery({
    queryKey: ["home-events-row"],
    queryFn: () => fn({ data: { filter: "upcoming", limit: 8 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const events = data ?? [];

  return (
    <section className="px-4 lg:px-8 pb-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-sky-600" />
          {isBn ? "আসন্ন ইভেন্ট" : "Upcoming events"}
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/events">
            {isBn ? "সব ইভেন্ট" : "View all"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : !events.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          {isBn ? "কোনো আসন্ন ইভেন্ট নেই।" : "No upcoming events."}
        </Card>
      ) : (
        <Carousel
          opts={{ loop: events.length > 3, align: "start" }}
          className="relative"
        >
          <CarouselContent className="-ml-4">
            {events.map((e: any) => (
              <CarouselItem key={e.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                <EventCard event={e} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-2 h-8 w-8" />
          <CarouselNext className="-right-2 h-8 w-8" />
        </Carousel>
      )}
    </section>
  );
}
