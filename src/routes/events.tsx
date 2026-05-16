import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Search, Calendar } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/events/event-card";
import { listEvents, listEventCategories } from "@/lib/events.functions";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — Halaqah" },
      {
        name: "description",
        content:
          "Browse upcoming Islamic lectures, workshops, and community events. RSVP and share with one tap.",
      },
      { property: "og:title", content: "Events — Halaqah" },
      {
        property: "og:description",
        content: "Browse upcoming Islamic lectures, workshops, and community events.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = React.useState<"upcoming" | "past" | "featured">("upcoming");
  const [categorySlug, setCategorySlug] = React.useState<string | undefined>();
  const [q, setQ] = React.useState("");

  const listFn = useServerFn(listEvents);
  const catsFn = useServerFn(listEventCategories);

  const cats = useQuery({ queryKey: ["event-cats"], queryFn: () => catsFn() });
  const list = useQuery({
    queryKey: ["events-list", filter, categorySlug, q],
    queryFn: () => listFn({ data: { filter, categorySlug, q: q || undefined } }),
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{t("events.title")}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{t("events.subtitle")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="upcoming">{t("events.upcoming")}</TabsTrigger>
              <TabsTrigger value="featured">{t("events.featured")}</TabsTrigger>
              <TabsTrigger value="past">{t("events.past")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("events.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        {cats.data && cats.data.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={categorySlug === undefined ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setCategorySlug(undefined)}
            >
              {t("events.all")}
            </Badge>
            {cats.data.map((c) => (
              <Badge
                key={c.id}
                variant={categorySlug === c.slug ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setCategorySlug(c.slug)}
              >
                {c.name_en}
              </Badge>
            ))}
          </div>
        )}

        {list.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        ) : !list.data || list.data.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t("events.empty")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("events.emptyHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.data.map((e) => (
              <EventCard key={e.id} event={{ ...e, mode: e.mode as "online" | "offline" | "hybrid" }} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
