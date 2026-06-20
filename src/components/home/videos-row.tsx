import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Video as VideoIcon, ListVideo, Layers } from "lucide-react";
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
import { PlaylistCard } from "@/components/videos/playlist-card";
import { VideoCard } from "@/components/videos/video-card";
import {
  listVideoCategories,
  listPlaylists,
  listVideos,
} from "@/lib/videos.functions";
import { useLanguage } from "@/hooks/use-language";

function SectionHeader({
  icon,
  title,
  to,
  more,
}: {
  icon: React.ReactNode;
  title: string;
  to: "/videos";
  more: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base lg:text-lg font-bold text-foreground flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <Button asChild variant="outline" size="sm">
        <Link to={to}>
          {more} <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

export function VideosRow() {
  const isBn = useLanguage().lang === "bn";

  const catFn = useServerFn(listVideoCategories);
  const cats = useQuery({
    queryKey: ["home-video-cats"],
    queryFn: () => catFn() as unknown as Promise<any[]>,
    staleTime: 10 * 60_000,
  });

  const plFn = useServerFn(listPlaylists);
  const playlists = useQuery({
    queryKey: ["home-playlists"],
    queryFn: () => plFn({ data: { limit: 4 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });

  const vFn = useServerFn(listVideos);
  const videos = useQuery({
    queryKey: ["home-videos-row"],
    queryFn: () => vFn({ data: { limit: 8 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });

  const catList = cats.data ?? [];
  const playlistList = playlists.data ?? [];
  const videoList = videos.data ?? [];

  return (
    <section className="px-4 lg:px-8 pb-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2 mb-1">
          <VideoIcon className="h-5 w-5 text-red-600" />
          {isBn ? "ভিডিও" : "Videos"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isBn ? "ক্যাটাগরি, প্লেলিস্ট এবং নতুন ভিডিও" : "Categories, playlists and fresh videos"}
        </p>
      </div>

      {/* Row 1: Categories infinite carousel */}
      <div>
        {cats.isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-40 shrink-0" />
            ))}
          </div>
        ) : catList.length === 0 ? null : (
          <Carousel
            opts={{ loop: catList.length > 5, align: "start", dragFree: true }}
            className="relative"
          >
            <CarouselContent className="-ml-3">
              {catList.map((c: any) => (
                <CarouselItem
                  key={c.id}
                  className="pl-3 basis-1/2 md:basis-1/4 lg:basis-1/5"
                >
                  <Link
                    to="/videos/category/$slug"
                    params={{ slug: c.slug }}
                    className="block group"
                  >
                    <Card className="p-3 flex items-center gap-3 hover:border-primary/40 hover:shadow-elegant transition-all h-full">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: c.color
                            ? `color-mix(in oklab, ${c.color} 25%, transparent)`
                            : "color-mix(in oklab, var(--primary) 15%, transparent)",
                        }}
                      >
                        <Layers
                          className="h-5 w-5"
                          style={{ color: c.color ?? "var(--primary)" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary">
                          {isBn ? c.name_bn : c.name_en}
                        </p>
                      </div>
                    </Card>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-2 h-7 w-7" />
            <CarouselNext className="-right-2 h-7 w-7" />
          </Carousel>
        )}
      </div>

      {/* Row 2: Playlists 4-col grid */}
      <div>
        <SectionHeader
          icon={<ListVideo className="h-4 w-4 text-red-600" />}
          title={isBn ? "প্লেলিস্ট" : "Playlists"}
          to="/videos"
          more={isBn ? "সব দেখুন" : "View all"}
        />
        {playlists.isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video w-full" />
            ))}
          </div>
        ) : playlistList.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {isBn ? "কোনো প্লেলিস্ট নেই।" : "No playlists yet."}
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {playlistList.slice(0, 4).map((p: any) => (
              <PlaylistCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Videos carousel — 4 visible on desktop, 1 mobile */}
      <div>
        <SectionHeader
          icon={<VideoIcon className="h-4 w-4 text-red-600" />}
          title={isBn ? "নতুন ভিডিও" : "Recent videos"}
          to="/videos"
          more={isBn ? "সব দেখুন" : "View all"}
        />
        {videos.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video w-full" />
            ))}
          </div>
        ) : videoList.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {isBn ? "কোনো ভিডিও নেই।" : "No videos yet."}
          </Card>
        ) : (
          <Carousel
            opts={{ loop: videoList.length > 4, align: "start" }}
            className="relative"
          >
            <CarouselContent className="-ml-4">
              {videoList.map((v: any) => (
                <CarouselItem key={v.id} className="pl-4 basis-full lg:basis-1/4">
                  <VideoCard v={v} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-2 h-8 w-8" />
            <CarouselNext className="-right-2 h-8 w-8" />
          </Carousel>
        )}
      </div>
    </section>
  );
}
