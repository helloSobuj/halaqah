import { Link } from "@tanstack/react-router";
import { BookOpen, Download, Star, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";

type Book = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  language: string;
  cover_image_url: string | null;
  source_type: "pdf" | "external";
  download_count: number;
  avg_rating: number;
  rating_count: number;
  category?: { slug?: string; name_en: string; name_bn: string; color?: string | null } | null;
};

export function BookCard({ book }: { book: Book }) {
  const { lang } = useLanguage();
  const catName = book.category ? (lang === "bn" ? book.category.name_bn : book.category.name_en) : null;

  return (
    <Link to="/library/$bookId" params={{ bookId: book.slug }} className="group block">
      <Card className="overflow-hidden border-border hover:border-primary/40 hover:shadow-elegant transition-all h-full">
        <div className="relative aspect-[3/4] bg-muted overflow-hidden">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.title}
              loading="lazy"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-primary/40" />
            </div>
          )}
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 text-[10px] uppercase backdrop-blur bg-background/80"
          >
            {book.source_type === "pdf" ? "PDF" : <><Globe className="h-3 w-3 mr-1 inline" />Link</>}
          </Badge>
        </div>
        <div className="p-3 space-y-1.5">
          {catName && (
            <Badge
              variant="secondary"
              className="text-[10px]"
              style={book.category?.color ? { backgroundColor: `${book.category.color}20`, color: book.category.color } : undefined}
            >
              {catName}
            </Badge>
          )}
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          {book.author && <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {book.avg_rating > 0 ? book.avg_rating.toFixed(1) : "—"}
              {book.rating_count > 0 && <span className="opacity-70">({book.rating_count})</span>}
            </span>
            <span className="inline-flex items-center gap-1 ml-auto">
              <Download className="h-3 w-3" /> {book.download_count}
            </span>
            <span className="uppercase text-[10px] font-medium">{book.language}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
