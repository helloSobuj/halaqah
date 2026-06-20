import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Library as LibraryIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCard } from "@/components/library/book-card";
import { listBooks } from "@/lib/library.functions";
import { useLanguage } from "@/hooks/use-language";

export function LibraryRow() {
  const isBn = useLanguage().lang === "bn";
  const fn = useServerFn(listBooks);
  const { data, isLoading } = useQuery({
    queryKey: ["home-library-row"],
    queryFn: () => fn({ data: { sort: "newest", limit: 4 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const books = data ?? [];

  return (
    <section className="px-4 lg:px-8 pb-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
          <LibraryIcon className="h-5 w-5 text-violet-600" />
          {isBn ? "লাইব্রেরি" : "Library"}
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/library">
            {isBn ? "সব বই দেখুন" : "View all books"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      ) : !books.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          {isBn ? "কোনো বই নেই।" : "No books yet."}
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {books.map((b: any) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </section>
  );
}
