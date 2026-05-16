import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Video, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/videos/video-card";
import { listVideos } from "@/lib/videos.functions";
import { useLanguage } from "@/hooks/use-language";

export function RecentVideos() {
  const isBn = useLanguage().lang === "bn";
  const fn = useServerFn(listVideos);
  const { data, isLoading } = useQuery({
    queryKey: ["home-videos"],
    queryFn: () => fn({ data: { limit: 2 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const videos = data ?? [];
  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Video className="h-4 w-4 text-red-600" />
          {isBn ? "নতুন ভিডিও" : "New videos"}
        </h3>
        <Link to="/videos" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          {isBn ? "সব" : "All"} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-2"><Skeleton className="aspect-video" /><Skeleton className="aspect-video" /></div>
      ) : !videos.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">{isBn ? "কোনো ভিডিও নেই।" : "No videos yet."}</p>
      ) : (
        <div className="space-y-2 flex-1">
          {videos.map((v: any) => <VideoCard key={v.id} v={v} />)}
        </div>
      )}
    </Card>
  );
}
