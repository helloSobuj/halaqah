import * as React from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Eye, Clock, Headphones, Calendar, ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Markdown } from "@/components/shared/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/blog/post-card";
import { Comments } from "@/components/blog/comments";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import {
  getPost, bumpBlogView, toggleBlogLike, getBlogLikeState,
} from "@/lib/blog.functions";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Blog · Halaqah` }] }),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const isBn = useLanguage().lang === "bn";
  const qc = useQueryClient();
  const getFn = useServerFn(getPost);
  const bumpFn = useServerFn(bumpBlogView);
  const toggleFn = useServerFn(toggleBlogLike);
  const likeStateFn = useServerFn(getBlogLikeState);

  const { data, isLoading } = useQuery({ queryKey: ["blog-post", slug], queryFn: () => getFn({ data: { slug } }) });

  const post = data?.post;

  React.useEffect(() => {
    if (post?.id) bumpFn({ data: { id: post.id } }).catch(() => {});
  }, [post?.id]);

  const likeQ = useQuery({
    queryKey: ["blog-like", post?.id, user?.id],
    enabled: !!post?.id && !!user,
    queryFn: () => likeStateFn({ data: { postId: post!.id } }),
  });
  const likeMut = useMutation({
    mutationFn: () => toggleFn({ data: { postId: post!.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog-like", post?.id] }); qc.invalidateQueries({ queryKey: ["blog-post", slug] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <AppShell><div className="max-w-3xl mx-auto px-4 py-10 space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-64 w-full" /></div></AppShell>;
  }
  if (!post) throw notFound();

  return (
    <AppShell>
      <ReadingProgress />
      <article className="max-w-3xl mx-auto px-4 lg:px-0 py-8 lg:py-12 space-y-6">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All articles
        </Link>

        {post.cover_image_url && (
          <img src={post.cover_image_url} alt="" className="w-full max-h-[420px] object-cover rounded-xl border" />
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {post.category && (
            <Link to="/blog/category/$slug" params={{ slug: post.category.slug }}>
              <Badge variant="secondary">{isBn && post.category.name_bn ? post.category.name_bn : post.category.name_en}</Badge>
            </Link>
          )}
          {post.published_at && (
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(post.published_at).toLocaleDateString()}</span>
          )}
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_minutes} min read</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{post.view_count} views</span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{isBn && post.title_bn ? post.title_bn : post.title_en}</h1>
        {(() => { const ex = isBn && post.excerpt_bn ? post.excerpt_bn : post.excerpt_en; return ex ? <p className="text-lg text-muted-foreground">{ex}</p> : null; })()}

        {data?.author && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8"><AvatarImage src={data.author.avatar_url ?? undefined} /><AvatarFallback>{(data.author.display_name ?? "?").slice(0,1)}</AvatarFallback></Avatar>
            <span className="text-sm text-muted-foreground">By <span className="text-foreground font-medium">{data.author.display_name ?? "Unknown"}</span></span>
          </div>
        )}

        {post.audio_url && (
          <div className="border rounded-xl p-4 bg-card space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Headphones className="h-4 w-4 text-primary" /> Listen to this article
            </div>
            <audio src={post.audio_url} controls className="w-full" />
          </div>
        )}

        <div className="prose-container">
          <Markdown source={(isBn ? (post.content_md_bn || post.content_md_en) : (post.content_md_en || post.content_md_bn)) || ""} />
        </div>

        {data?.tags?.length ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {data.tags.map((t: any) => (
              <Link key={t.id} to="/blog/tag/$slug" params={{ slug: t.slug }}>
                <Badge variant="outline">#{t.label_en}</Badge>
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-3 border-t border-b border-border py-4">
          <Button variant={likeQ.data?.liked ? "default" : "outline"} size="sm"
            disabled={!user || likeMut.isPending}
            onClick={() => user ? likeMut.mutate() : toast.error("Sign in to like")}>
            <Heart className={`h-4 w-4 mr-1.5 ${likeQ.data?.liked ? "fill-current" : ""}`} />
            {post.like_count} {post.like_count === 1 ? "like" : "likes"}
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}>
            Share
          </Button>
        </div>

        <Comments postId={post.id} />

        {data?.suggested?.length ? (
          <section className="space-y-4 pt-6">
            <h2 className="text-xl font-bold">You might also like</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.suggested.map((p: any) => <PostCard key={p.id} post={p} />)}
            </div>
          </section>
        ) : null}
      </article>
    </AppShell>
  );
}
