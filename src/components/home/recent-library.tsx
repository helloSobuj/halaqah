import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Library, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCard } from "@/components/library/book-card";
import { listBooks } from "@/lib/library.functions";
import { useLanguage } from "@/hooks/use-language";

export function RecentLibrary() {
  const isBn = useLanguage().lang === "bn";
  const fn = useServerFn(listBooks);
  const { data, isLoading } = useQuery({
    queryKey: ["home-library"],
    queryFn: () => fn({ data: { sort: "newest", limit: 2 } }) as unknown as Promise<any[]>,
    staleTime: 5 * 60_000,
  });
  const books = data ?? [];
  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Library className="h-4 w-4 text-violet-600" />
          {isBn ? "নতুন বই" : "New books"}
        </h3>
        <Link to="/library" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          {isBn ? "সব" : "All"} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2"><Skeleton className="aspect-[3/4]" /><Skeleton className="aspect-[3/4]" /></div>
      ) : !books.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">{isBn ? "কোনো বই নেই।" : "No books yet."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 flex-1">
          {books.map((b: any) => <BookCard key={b.id} book={b} />)}
        </div>
      )}
    </Card>
  );
}
