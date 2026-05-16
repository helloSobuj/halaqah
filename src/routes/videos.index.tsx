import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Video as VideoIcon } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/videos/video-card";
import { PlaylistCard } from "@/components/videos/playlist-card";
import { listVideoCategories, listPlaylists, listVideos } from "@/lib/videos.functions";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/videos/")({
  head: () => ({
    meta: [
      { title: "Videos — Halaqah" },
      { name: "description", content: "Watch Islamic lectures, tafsir, seerah and more — curated YouTube playlists." },
      { property: "og:title", content: "Videos — Halaqah" },
      { property: "og:description", content: "Watch Islamic lectures, tafsir, seerah and more." },
    ],
  }),
  component: VideosIndex,
});

function VideosIndex() {
  const { lang } = useLanguage();
  const catsFn = useServerFn(listVideoCategories);
  const featPlFn = useServerFn(listPlaylists);
  const recentFn = useServerFn(listVideos);

  const cats = useQuery({ queryKey: ["video-cats"], queryFn: () => catsFn() });
  const featured = useQuery({ queryKey: ["video-featured-pls"], queryFn: () => featPlFn({ data: { featured: true, limit: 8 } }) });
  const recent = useQuery({ queryKey: ["video-recent"], queryFn: () => recentFn({ data: { limit: 12 } }) });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <VideoIcon className="h-7 w-7 text-primary" /> Videos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Curated Islamic lectures and talks.</p>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">Categories</h2>
          {cats.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : !cats.data?.length ? (
            <Card className="p-6 text-sm text-muted-foreground text-center">No categories yet.</Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cats.data.map((c: any) => (
                <Link key={c.id} to="/videos/category/$slug" params={{ slug: c.slug }}>
                  <Card className="p-4 hover:border-primary/40 transition-colors flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: `${c.color ?? "#6366f1"}20`, color: c.color ?? "#6366f1" }}
                    >
                      {c.icon ?? c.name_en.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{lang === "bn" ? c.name_bn : c.name_en}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {featured.data && featured.data.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Featured playlists</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.data.map((p: any) => <PlaylistCard key={p.id} p={p} />)}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Recent videos</h2>
          {recent.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-video" />)}
            </div>
          ) : !recent.data?.length ? (
            <Card className="p-8 text-center text-muted-foreground">
              <VideoIcon className="h-8 w-8 mx-auto mb-2 opacity-60" />
              No videos yet. Check back soon.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recent.data.map((v: any) => <VideoCard key={v.id} v={v} />)}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
