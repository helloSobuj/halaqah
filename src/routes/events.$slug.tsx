import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MapPin, Globe, Users, Clock, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/qa/markdown";
import { RsvpButton } from "@/components/events/rsvp-button";
import { ShareMenu } from "@/components/events/share-menu";
import { HostRegistration } from "@/components/events/host-registration";

import { getEventBySlug } from "@/lib/events.functions";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ params }) => {
    try {
      return await getEventBySlug({ data: { slug: params.slug } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Event — Halaqah" }] };
    const e = loaderData.event;
    const url = `https://halaqah.lovable.app/events/${params.slug}`;
    const img = e.cover_image_url;
    const meta = [
      { title: `${e.title_en} — Halaqah` },
      {
        name: "description",
        content: e.description_md_en.slice(0, 160) || `Join us for ${e.title_en}.`,
      },
      { property: "og:title", content: e.title_en },
      {
        property: "og:description",
        content: e.description_md_en.slice(0, 200) || `Join us for ${e.title_en}.`,
      },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: e.title_en },
    ];
    if (img) {
      meta.push({ property: "og:image", content: img });
      meta.push({ name: "twitter:image", content: img });
    }
    return { meta };
  },
  errorComponent: () => (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Could not load this event.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/events">Back to events</Link>
        </Button>
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <p className="text-muted-foreground mt-2">
          This event may have been removed or the link is incorrect.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/events">Back to events</Link>
        </Button>
      </div>
    </AppShell>
  ),
  component: EventDetail,
});

function EventDetail() {
  const initial = Route.useLoaderData();
  const params = Route.useParams();
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const getFn = useServerFn(getEventBySlug);
  const { data } = useQuery({
    queryKey: ["event-detail", params.slug],
    queryFn: () => getFn({ data: { slug: params.slug } }),
    initialData: initial,
  });
  if (!data) return null;
  const { category, counts } = data;
  const e = { ...data.event, mode: data.event.mode as "online" | "offline" | "hybrid" };
  const isBn = lang === "bn";
  const title = isBn && e.title_bn ? e.title_bn : e.title_en;
  const altTitle = isBn ? e.title_en : e.title_bn;
  const description = isBn && e.description_md_bn ? e.description_md_bn : e.description_md_en;
  const categoryName = category ? (isBn ? category.name_bn : category.name_en) : null;

  const startDate = new Date(e.starts_at);
  const endDate = e.ends_at ? new Date(e.ends_at) : null;
  const fmt = (d: Date) =>
    d.toLocaleString(isBn ? "bn-BD" : "en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

  return (
    <AppShell>
      <article className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("events.backToEvents", "Back to events")}
        </Link>

        {e.cover_image_url && (
          <div className="aspect-[16/8] rounded-2xl overflow-hidden bg-muted">
            <img
              src={e.cover_image_url}
              alt={title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {categoryName && (
                <Badge
                  variant="secondary"
                  style={
                    category?.color
                      ? {
                          backgroundColor: `${category.color}20`,
                          color: category.color,
                        }
                      : undefined
                  }
                >
                  {categoryName}
                </Badge>
              )}
              {e.is_featured && <Badge>{t("events.featured", "Featured")}</Badge>}
              <Badge variant="outline" className="capitalize">
                {String(t(`events.mode.${e.mode}` as never, { defaultValue: e.mode }))}
              </Badge>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{title}</h1>
            {altTitle && altTitle !== title && (
              <p className="text-lg text-muted-foreground">{altTitle}</p>
            )}
          </div>
        </div>

        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{fmt(startDate)}</p>
                {endDate && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5" /> {t("events.ends", "Ends")} {fmt(endDate)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              {e.mode === "online" ? (
                <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              ) : (
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                {e.mode === "online" ? (
                  <>
                    <p className="font-medium">{t("events.onlineEvent", "Online event")}</p>
                    {e.online_url && (
                      <a
                        href={e.online_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm mt-0.5"
                      >
                        {t("events.joinLink", "Join link")} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium">{e.venue || t("events.venueTba", "Venue TBA")}</p>
                    {e.address && (
                      <p className="text-muted-foreground mt-0.5">{e.address}</p>
                    )}
                    {e.mode === "hybrid" && e.online_url && (
                      <a
                        href={e.online_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm mt-0.5"
                      >
                        {t("events.onlineJoinLink", "Online join link")} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" /> {counts.going} {t("events.going", "going")} · {counts.interested} {t("events.interested", "interested")}
            </span>
            {e.capacity ? <span>· {t("events.capacity", "Capacity")} {e.capacity}</span> : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <RsvpButton eventId={e.id} />
            <ShareMenu event={e} />
          </div>
        </Card>

        <HostRegistration
          eventId={e.id}
          eventSlug={params.slug}
          allowRegistration={(e as { allow_host_registration?: boolean }).allow_host_registration !== false}
          host={{
            host_user_id: (e as { host_user_id?: string | null }).host_user_id ?? null,
            host_name: (e as { host_name?: string | null }).host_name ?? null,
            host_address: (e as { host_address?: string | null }).host_address ?? null,
            host_capacity: (e as { host_capacity?: number | null }).host_capacity ?? null,
          }}
        />


        {description && (
          <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
            <Markdown source={description} />
          </div>
        )}
      </article>
    </AppShell>
  );
}
