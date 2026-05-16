import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Video as VideoIcon } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/videos/video-card";
import { PlaylistCard } from "@/components/videos/playlist-card";
import { listPlaylists, listVideos, listVideoCategories } from "@/lib/videos.functions";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/videos/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Videos · ${params.slug} — Halaqah` },
      { name: "description", content: `Watch videos in the ${params.slug} category.` },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { lang } = useLanguage();
  const catsFn = useServerFn(listVideoCategories);
  const plFn = useServerFn(listPlaylists);
  const vidFn = useServerFn(listVideos);

  const cats = useQuery({ queryKey: ["video-cats"], queryFn: () => catsFn() });
  const playlists = useQuery({ queryKey: ["video-cat-pl", slug], queryFn: () => plFn({ data: { categorySlug: slug, limit: 24 } }) });
  const videos = useQuery({ queryKey: ["video-cat-vid", slug], queryFn: () => vidFn({ data: { categorySlug: slug, limit: 24 } }) });

  const cat = cats.data?.find((c: any) => c.slug === slug);
  const name = cat ? (lang === "bn" ? cat.name_bn : cat.name_en) : slug;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <Link to="/videos" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> All videos
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">{name}</h1>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">Playlists</h2>
          {playlists.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-video" />)}
            </div>
          ) : playlists.data?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {playlists.data.map((p: any) => <PlaylistCard key={p.id} p={p} />)}
            </div>
          ) : (
            <Card className="p-6 text-sm text-muted-foreground text-center">No playlists in this category.</Card>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Videos</h2>
          {videos.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-video" />)}
            </div>
          ) : videos.data?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.data.map((v: any) => <VideoCard key={v.id} v={v} />)}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <VideoIcon className="h-8 w-8 mx-auto mb-2 opacity-60" />
              No videos yet.
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
