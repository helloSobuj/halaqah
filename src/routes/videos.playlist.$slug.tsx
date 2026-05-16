import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PlayCircle, ListVideo } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/videos/video-card";
import { Markdown } from "@/components/shared/markdown";
import { getPlaylist } from "@/lib/videos.functions";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/videos/playlist/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Playlist — Halaqah` },
      { name: "description", content: `Watch all videos in this playlist.` },
    ],
  }),
  component: PlaylistPage,
});

function PlaylistPage() {
  const { slug } = Route.useParams();
  const { lang } = useLanguage();
  const fn = useServerFn(getPlaylist);
  const q = useQuery({ queryKey: ["playlist", slug], queryFn: () => fn({ data: { slug } }) });

  if (q.isLoading) {
    return <AppShell><div className="max-w-7xl mx-auto p-6"><Skeleton className="h-64 w-full" /></div></AppShell>;
  }
  if (!q.data) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto p-10 text-center">
          <h1 className="text-xl font-semibold">Playlist not found</h1>
          <Link to="/videos" className="text-sm text-primary mt-2 inline-block">Back to videos</Link>
        </div>
      </AppShell>
    );
  }

  const p = q.data.playlist;
  const videos = q.data.videos;
  const title = lang === "bn" && p.title_bn ? p.title_bn : p.title_en;
  const desc = lang === "bn" && p.description_bn ? p.description_bn : p.description_en;
  const first = videos[0];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <Link to="/videos" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> All videos
        </Link>

        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-[280px_1fr]">
            <div className="aspect-video md:aspect-auto bg-muted">
              {p.cover_image_url ? (
                <img src={p.cover_image_url} alt={title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <ListVideo className="h-16 w-16 text-primary/60" />
                </div>
              )}
            </div>
            <div className="p-5 flex flex-col">
              <h1 className="text-xl lg:text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{videos.length} videos</p>
              {desc && <p className="text-sm mt-3 whitespace-pre-wrap">{desc}</p>}
              <div className="mt-auto pt-4">
                {first && (
                  <Link to="/videos/watch/$slug" params={{ slug: first.slug }}>
                    <Button><PlayCircle className="h-4 w-4 mr-1.5" /> Play all</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Card>

        <section>
          <h2 className="text-lg font-semibold mb-3">Videos in this playlist</h2>
          {videos.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground text-center">No videos yet.</Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((v: any) => <VideoCard key={v.id} v={v} />)}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
