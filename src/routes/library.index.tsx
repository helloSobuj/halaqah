import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Search, Library as LibIcon, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookCard } from "@/components/library/book-card";
import { listBooks, listLibraryCategories } from "@/lib/library.functions";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/library/")({
  head: () => ({
    meta: [
      { title: "Library — Halaqah" },
      { name: "description", content: "Browse Islamic books: Quran, Hadith, Aqeedah, Fiqh, Seerah and more." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [q, setQ] = React.useState("");
  const [categorySlug, setCategorySlug] = React.useState<string | undefined>();
  const [language, setLanguage] = React.useState<string | undefined>();
  const [sourceType, setSourceType] = React.useState<string | undefined>();
  const [sort, setSort] = React.useState<"newest" | "downloads" | "rating">("newest");

  const listFn = useServerFn(listBooks);
  const catsFn = useServerFn(listLibraryCategories);

  const cats = useQuery({ queryKey: ["library-cats"], queryFn: () => catsFn() });
  const list = useQuery({
    queryKey: ["library-list", q, categorySlug, language, sourceType, sort],
    queryFn: () =>
      listFn({
        data: {
          q: q || undefined,
          categorySlug,
          language: language as any,
          sourceType: sourceType as any,
          sort,
        },
      }),
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{t("library.title", "Library")}</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {t("library.subtitle", "Browse and download Islamic books. Submit your favorites for everyone.")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/library/my-submissions"><Button variant="outline" size="sm">{t("library.mySubmissions", "My submissions")}</Button></Link>
            <Link to="/library/submit"><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />{t("library.submit", "Submit a book")}</Button></Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("library.searchPlaceholder", "Search books…")} className="pl-9" />
          </div>
          <Select value={language ?? "all"} onValueChange={(v) => setLanguage(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="bn">Bangla</SelectItem>
              <SelectItem value="ur">Urdu</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceType ?? "all"} onValueChange={(v) => setSourceType(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="downloads">Most downloaded</SelectItem>
              <SelectItem value="rating">Top rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {cats.data && cats.data.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={categorySlug === undefined ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setCategorySlug(undefined)}
            >
              All
            </Badge>
            {cats.data.map((c) => (
              <Badge
                key={c.id}
                variant={categorySlug === c.slug ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setCategorySlug(c.slug)}
              >
                {lang === "bn" ? c.name_bn : c.name_en}
              </Badge>
            ))}
          </div>
        )}

        {list.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : !list.data || list.data.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl">
            <LibIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No books found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {list.data.map((b: any) => <BookCard key={b.id} book={b as any} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
