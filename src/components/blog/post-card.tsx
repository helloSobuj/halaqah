import { Link } from "@tanstack/react-router";
import { Headphones, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";

export type BlogPostCardData = {
  id: string;
  slug: string;
  title_en: string;
  title_bn?: string | null;
  excerpt_en?: string | null;
  excerpt_bn?: string | null;
  cover_image_url?: string | null;
  audio_url?: string | null;
  reading_minutes?: number | null;
  published_at?: string | null;
  category?: { name_en: string; name_bn?: string | null; slug: string; color?: string | null } | null;
};

export function PostCard({ post }: { post: BlogPostCardData }) {
  const isBn = useLanguage().lang === "bn";
  const title = isBn && post.title_bn ? post.title_bn : post.title_en;
  const excerpt = isBn && post.excerpt_bn ? post.excerpt_bn : post.excerpt_en;
  const catName = post.category ? (isBn && post.category.name_bn ? post.category.name_bn : post.category.name_en) : null;
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} className="group block">
      <Card className="overflow-hidden h-full hover:shadow-elegant transition-shadow">
        {post.cover_image_url ? (
          <div className="aspect-[16/9] overflow-hidden bg-muted">
            <img src={post.cover_image_url} alt="" loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-accent" />
        )}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            {catName && (
              <Badge variant="secondary" className="text-[10px]">{catName}</Badge>
            )}
            {post.reading_minutes ? (
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_minutes} min</span>
            ) : null}
            {post.audio_url && (
              <span className="inline-flex items-center gap-1 text-primary"><Headphones className="h-3 w-3" />Listen</span>
            )}
          </div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
          {excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
