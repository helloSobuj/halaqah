import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/blog/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { listPosts } from "@/lib/blog.functions";

export const Route = createFileRoute("/blog/category/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Blog · Halaqah` }] }),
  component: BlogCategoryPage,
});

function BlogCategoryPage() {
  const { slug } = Route.useParams();
  const fn = useServerFn(listPosts);
  const { data, isLoading } = useQuery({
    queryKey: ["blog-cat", slug],
    queryFn: () => fn({ data: { categorySlug: slug, page: 1, pageSize: 30 } }),
  });
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl lg:text-3xl font-bold capitalize">Category: {slug.replace(/-/g, " ")}</h1>
        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-72"/>)}</div>
        ) : !data?.posts.length ? (
          <p className="text-muted-foreground">No posts in this category yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.posts.map((p: any) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
