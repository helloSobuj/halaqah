import { Link } from "@tanstack/react-router";
import { ListVideo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";

export type PlaylistCardData = {
  slug: string;
  title_en: string;
  title_bn?: string | null;
  description_en?: string | null;
  description_bn?: string | null;
  cover_image_url?: string | null;
  category?: { name_en: string; name_bn: string; slug: string } | null;
};

export function PlaylistCard({ p }: { p: PlaylistCardData }) {
  const { lang } = useLanguage();
  const title = lang === "bn" && p.title_bn ? p.title_bn : p.title_en;
  const desc = lang === "bn" && p.description_bn ? p.description_bn : p.description_en;
  return (
    <Link to="/videos/playlist/$slug" params={{ slug: p.slug }} className="block group">
      <Card className="overflow-hidden hover:border-primary/40 transition-colors h-full">
        <div className="relative aspect-video bg-muted">
          {p.cover_image_url ? (
            <img src={p.cover_image_url} alt={title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <ListVideo className="h-12 w-12 text-primary/60" />
            </div>
          )}
        </div>
        <div className="p-3">
          {p.category && (
            <Badge variant="secondary" className="text-[10px] mb-1.5">
              {lang === "bn" ? p.category.name_bn : p.category.name_en}
            </Badge>
          )}
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary">{title}</h3>
          {desc && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{desc}</p>}
        </div>
      </Card>
    </Link>
  );
}
