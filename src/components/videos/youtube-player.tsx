import { youtubeEmbedUrl } from "@/lib/youtube";

export function YouTubePlayer({ videoId, title }: { videoId: string; title?: string }) {
  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        src={youtubeEmbedUrl(videoId)}
        title={title ?? "Video"}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
