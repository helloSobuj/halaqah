import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, User } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubePlayer } from "@/components/videos/youtube-player";
import { getVideo, bumpVideoView } from "@/lib/videos.functions";
import { useLanguage } from "@/hooks/use-language";
import { youtubeThumbnail } from "@/lib/youtube";

export const Route = createFileRoute("/videos/watch/$slug")({
  component: WatchPage,
});

function WatchPage() {
  const { slug } = Route.useParams();
  const { lang } = useLanguage();
  const fn = useServerFn(getVideo);
  const bumpFn = useServerFn(bumpVideoView);
  const q = useQuery({ queryKey: ["video", slug], queryFn: () => fn({ data: { slug } }) });

  React.useEffect(() => {
    if (q.data?.video?.id) {
      bumpFn({ data: { id: q.data.video.id } }).catch(() => {});
    }
  }, [q.data?.video?.id, bumpFn]);

  if (q.isLoading) {
    return <AppShell><div className="max-w-6xl mx-auto p-6"><Skeleton className="aspect-video w-full" /></div></AppShell>;
  }
  if (!q.data) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto p-10 text-center">
          <h1 className="text-xl font-semibold">Video not found</h1>
          <Link to="/videos" className="text-sm text-primary mt-2 inline-block">Back to videos</Link>
        </div>
      </AppShell>
    );
  }

  const v = q.data.video;
  const siblings = q.data.siblings as any[];
  const title = lang === "bn" && v.title_bn ? v.title_bn : v.title_en;
  const desc = lang === "bn" && v.description_bn ? v.description_bn : v.description_en;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-4">
        <Link to="/videos" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> All videos
        </Link>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4 min-w-0">
            <YouTubePlayer videoId={v.youtube_video_id} title={title} />
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">{title}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                {v.speaker && (
                  <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{v.speaker}</span>
                )}
                <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{v.view_count} views</span>
                {v.category && (
                  <Link to="/videos/category/$slug" params={{ slug: v.category.slug }}>
                    <Badge variant="secondary">{lang === "bn" ? v.category.name_bn : v.category.name_en}</Badge>
                  </Link>
                )}
                {v.playlist && (
                  <Link to="/videos/playlist/$slug" params={{ slug: v.playlist.slug }}>
                    <Badge variant="outline">{v.playlist.title_en}</Badge>
                  </Link>
                )}
              </div>
            </div>
            {desc && (
              <Card className="p-4">
                <h2 className="font-semibold text-sm mb-2">Description</h2>
                <p className="text-sm whitespace-pre-wrap text-foreground/85">{desc}</p>
              </Card>
            )}
          </div>

          {siblings.length > 1 && (
            <aside className="space-y-3">
              <h2 className="text-sm font-semibold">Up next in playlist</h2>
              <div className="space-y-2">
                {siblings.map((s) => (
                  <Link
                    key={s.id}
                    to="/videos/watch/$slug"
                    params={{ slug: s.slug }}
                    className={`flex gap-2 rounded-lg p-1.5 hover:bg-accent transition-colors ${s.slug === slug ? "bg-accent" : ""}`}
                  >
                    <img
                      src={s.thumbnail_url || youtubeThumbnail(s.youtube_video_id, "mq")}
                      alt=""
                      className="h-14 w-24 rounded object-cover flex-shrink-0 bg-muted"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium line-clamp-2">
                        {lang === "bn" && s.title_bn ? s.title_bn : s.title_en}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </AppShell>
  );
}
