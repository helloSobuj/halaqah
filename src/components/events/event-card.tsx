import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Globe, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";

type EventCardProps = {
  event: {
    id: string;
    slug: string;
    title_en: string;
    title_bn: string;
    cover_image_url: string | null;
    starts_at: string;
    timezone: string;
    mode: "online" | "offline" | "hybrid";
    venue: string | null;
    is_featured: boolean;
    category?: {
      slug: string;
      name_en: string;
      name_bn: string;
      color: string | null;
    } | null;
    counts?: { going: number; interested: number };
  };
};

export function EventCard({ event }: EventCardProps) {
  const { language } = useLanguage();
  const title = language === "bn" && event.title_bn ? event.title_bn : event.title_en;
  const catName = event.category
    ? language === "bn"
      ? event.category.name_bn
      : event.category.name_en
    : null;

  const date = new Date(event.starts_at);
  const day = date.toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
    day: "numeric",
  });
  const month = date.toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
    month: "short",
  });
  const time = date.toLocaleTimeString(language === "bn" ? "bn-BD" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Link to="/events/$slug" params={{ slug: event.slug }} className="group block">
      <Card className="overflow-hidden border-border hover:border-primary/40 hover:shadow-elegant transition-all h-full">
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
              <Calendar className="h-12 w-12 text-primary/40" />
            </div>
          )}
          <div className="absolute top-3 left-3 bg-background/95 backdrop-blur rounded-lg px-2.5 py-1.5 text-center shadow-soft">
            <div className="text-[10px] font-medium text-muted-foreground uppercase leading-none">
              {month}
            </div>
            <div className="text-lg font-bold leading-tight">{day}</div>
          </div>
          {event.is_featured && (
            <Badge className="absolute top-3 right-3" variant="default">
              Featured
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {catName && (
              <Badge
                variant="secondary"
                className="text-xs"
                style={
                  event.category?.color
                    ? { backgroundColor: `${event.category.color}20`, color: event.category.color }
                    : undefined
                }
              >
                {catName}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {event.mode === "online" ? (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" /> Online
              </span>
            ) : event.venue ? (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{event.venue}</span>
              </span>
            ) : null}
            {event.counts && (event.counts.going > 0 || event.counts.interested > 0) && (
              <span className="inline-flex items-center gap-1 ml-auto">
                <Users className="h-3 w-3" /> {event.counts.going + event.counts.interested}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
