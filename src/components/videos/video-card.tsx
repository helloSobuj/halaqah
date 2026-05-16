import * as React from "react";
import { Link } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { youtubeThumbnail } from "@/lib/youtube";
import { useLanguage } from "@/hooks/use-language";

export type VideoCardData = {
  slug: string;
  title_en: string;
  title_bn?: string | null;
  thumbnail_url?: string | null;
  youtube_video_id: string;
  duration_seconds?: number | null;
  speaker?: string | null;
  view_count?: number;
  category?: { name_en: string; name_bn: string } | null;
};

function fmtDuration(s?: number | null) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${(m % 60).toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VideoCard({ v }: { v: VideoCardData }) {
  const { lang: language } = useLanguage();
  const title = language === "bn" && v.title_bn ? v.title_bn : v.title_en;
  const thumb = v.thumbnail_url || youtubeThumbnail(v.youtube_video_id, "hq");
  const dur = fmtDuration(v.duration_seconds);
  return (
    <Link to="/videos/watch/$slug" params={{ slug: v.slug }} className="block group">
      <Card className="overflow-hidden hover:border-primary/40 transition-colors">
        <div className="relative aspect-video bg-muted">
          <img src={thumb} alt={title} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
            <PlayCircle className="h-12 w-12 text-white" />
          </div>
          {dur && (
            <span className="absolute bottom-1.5 right-1.5 text-[10px] font-medium bg-black/80 text-white px-1.5 py-0.5 rounded">
              {dur}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary">{title}</h3>
          {(v.speaker || v.category) && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {v.speaker ?? ""}
              {v.speaker && v.category ? " · " : ""}
              {v.category ? (language === "bn" ? v.category.name_bn : v.category.name_en) : ""}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
