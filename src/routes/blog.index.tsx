import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/blog/post-card";
import { listPosts, listBlogCategories, listBlogTags } from "@/lib/blog.functions";

export const Route = createFileRoute("/blog/")({
  head: () => ({ meta: [
    { title: "Blog — Halaqah" },
    { name: "description", content: "Articles, reflections, and writings from the Halaqah community." },
  ] }),
  component: BlogIndex,
});

function BlogIndex() {
  const postsFn = useServerFn(listPosts);
  const catsFn = useServerFn(listBlogCategories);
  const tagsFn = useServerFn(listBlogTags);

  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);

  const posts = useQuery({
    queryKey: ["blog-posts", debounced],
    queryFn: () => postsFn({ data: { q: debounced || undefined, page: 1, pageSize: 24 } }),
  });
  const featured = useQuery({
    queryKey: ["blog-posts-featured"],
    queryFn: () => postsFn({ data: { featured: true, page: 1, pageSize: 3 } }),
  });
  const cats = useQuery({ queryKey: ["blog-cats"], queryFn: () => catsFn() });
  const tags = useQuery({ queryKey: ["blog-tags"], queryFn: () => tagsFn({ data: { limit: 20 } }) });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:py-12 space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Blog</h1>
          <p className="text-muted-foreground">Articles, reflections, and writings.</p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles…" className="pl-9" />
          </div>
        </div>

        {(cats.data?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            {cats.data!.map((c: any) => (
              <Link key={c.id} to="/blog/category/$slug" params={{ slug: c.slug }}>
                <Badge variant="secondary" className="hover:bg-primary/10 cursor-pointer">{c.name_en}</Badge>
              </Link>
            ))}
          </div>
        )}

        {!debounced && featured.data?.posts?.length ? (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Featured</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {featured.data.posts.map((p: any) => <PostCard key={p.id} post={p} />)}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-bold">{debounced ? "Results" : "Latest"}</h2>
          {posts.isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
            </div>
          ) : !posts.data?.posts.length ? (
            <p className="text-muted-foreground">No posts yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.data.posts.map((p: any) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </section>

        {(tags.data?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.data!.map((t: any) => (
                <Link key={t.id} to="/blog/tag/$slug" params={{ slug: t.slug }}>
                  <Badge variant="outline" className="hover:bg-accent cursor-pointer">#{t.label_en}</Badge>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
