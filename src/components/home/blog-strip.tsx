import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PenSquare, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { PostCard, type BlogPostCardData } from "@/components/blog/post-card";
import { listPosts } from "@/lib/blog.functions";
import { useLanguage } from "@/hooks/use-language";

export function BlogStrip() {
  const isBn = useLanguage().lang === "bn";
  const fn = useServerFn(listPosts);
  const { data, isLoading } = useQuery({
    queryKey: ["home-blog-recent"],
    queryFn: () => fn({ data: { sortBy: "recent", pageSize: 4, page: 1 } }) as unknown as Promise<{ posts: BlogPostCardData[]; total: number }>,
    staleTime: 5 * 60_000,
  });
  const posts = data?.posts ?? [];

  return (
    <section className="px-4 lg:px-8 pb-12 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
          <PenSquare className="h-5 w-5 text-teal-600" />
          {isBn ? "সর্বশেষ ব্লগ" : "Latest from the blog"}
        </h2>
        <Link to="/blog" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          {isBn ? "সব পোস্ট" : "View all"} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : !posts.length ? (
        <Card className="p-8 text-center text-muted-foreground">{isBn ? "এখনো কোনো পোস্ট নেই।" : "No posts yet."}</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </section>
  );
}
