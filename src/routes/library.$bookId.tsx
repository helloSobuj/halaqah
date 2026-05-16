import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Download, ExternalLink, Bookmark, BookmarkCheck, Calendar, FileText, Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/qa/markdown";
import { StarRating } from "@/components/library/star-rating";
import { BookShareMenu } from "@/components/library/book-share-menu";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  getBookBySlug, getMyBookState, toggleBookmark, setMyRating,
  recordDownload, listBookComments, addComment, deleteComment,
} from "@/lib/library.functions";

export const Route = createFileRoute("/library/$bookId")({
  head: ({ params }) => ({
    meta: [
      { title: `Book — Halaqah` },
      { property: "og:title", content: params.bookId },
    ],
  }),
  component: BookDetailPage,
});

function BookDetailPage() {
  const { bookId } = Route.useParams();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const qc = useQueryClient();

  const getFn = useServerFn(getBookBySlug);
  const stateFn = useServerFn(getMyBookState);
  const bookmarkFn = useServerFn(toggleBookmark);
  const rateFn = useServerFn(setMyRating);
  const downloadFn = useServerFn(recordDownload);
  const commentsFn = useServerFn(listBookComments);
  const addCommentFn = useServerFn(addComment);
  const delCommentFn = useServerFn(deleteComment);

  const book = useQuery({ queryKey: ["book", bookId], queryFn: () => getFn({ data: { slug: bookId } }) });
  const myState = useQuery({
    queryKey: ["book-state", book.data?.id, user?.id],
    queryFn: () => stateFn({ data: { bookId: book.data!.id } }),
    enabled: !!book.data?.id && !!user,
  });
  const comments = useQuery({
    queryKey: ["book-comments", book.data?.id],
    queryFn: () => commentsFn({ data: { bookId: book.data!.id } }),
    enabled: !!book.data?.id,
  });

  const bookmarkMut = useMutation({
    mutationFn: () => bookmarkFn({ data: { bookId: book.data!.id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["book-state", book.data?.id] });
      toast.success(r.bookmarked ? "Bookmarked" : "Removed bookmark");
    },
  });

  const rateMut = useMutation({
    mutationFn: (value: number) => rateFn({ data: { bookId: book.data!.id, value } }),
    onSuccess: () => {
      toast.success("Rating saved");
      qc.invalidateQueries({ queryKey: ["book", bookId] });
      qc.invalidateQueries({ queryKey: ["book-state", book.data?.id] });
    },
  });

  const handleOpen = async () => {
    if (!book.data) return;
    downloadFn({ data: { bookId: book.data.id } }).catch(() => {});
    const url = book.data.source_type === "pdf" ? book.data.pdf_path : book.data.external_url;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const [commentText, setCommentText] = React.useState("");
  const addCommentMut = useMutation({
    mutationFn: () => addCommentFn({ data: { bookId: book.data!.id, body_md: commentText } }),
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["book-comments", book.data?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delCommentMut = useMutation({
    mutationFn: (id: string) => delCommentFn({ data: { commentId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["book-comments", book.data?.id] }),
  });

  if (book.isLoading) {
    return <AppShell><div className="max-w-4xl mx-auto p-6"><Skeleton className="h-96 w-full" /></div></AppShell>;
  }
  if (!book.data) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto p-10 text-center">
          <p className="text-muted-foreground">Book not found.</p>
          <Link to="/library"><Button variant="link">Back to library</Button></Link>
        </div>
      </AppShell>
    );
  }

  const b = book.data as any;
  const catName = b.category ? (lang === "bn" ? b.category.name_bn : b.category.name_en) : null;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <Link to="/library" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>

        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted">
            {b.cover_image_url ? (
              <img src={b.cover_image_url} alt={b.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent">
                <BookOpen className="h-16 w-16 text-primary/40" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {catName && <Badge variant="secondary">{catName}</Badge>}
              <Badge variant="outline" className="uppercase text-[10px]">{b.language}</Badge>
              <Badge variant="outline" className="uppercase text-[10px]">{b.source_type}</Badge>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold">{b.title}</h1>
            {b.author && <p className="text-muted-foreground">by {b.author}</p>}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <StarRating value={Math.round(b.avg_rating)} readOnly size="sm" />
                {b.avg_rating > 0 ? `${Number(b.avg_rating).toFixed(1)} (${b.rating_count})` : "No ratings"}
              </span>
              <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {b.download_count}</span>
              {b.pages && <span>{b.pages} pages</span>}
              {b.published_year && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {b.published_year}</span>}
            </div>
            

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleOpen} size="lg">
                {b.source_type === "pdf" ? <><FileText className="h-4 w-4 mr-1.5" />Read / Download</> : <><ExternalLink className="h-4 w-4 mr-1.5" />Open link</>}
              </Button>
              {user && (
                <Button
                  variant="outline"
                  size="lg"
                  disabled={bookmarkMut.isPending}
                  onClick={() => bookmarkMut.mutate()}
                >
                  {myState.data?.bookmarked ? <BookmarkCheck className="h-4 w-4 mr-1.5" /> : <Bookmark className="h-4 w-4 mr-1.5" />}
                  {myState.data?.bookmarked ? "Bookmarked" : "Bookmark"}
                </Button>
              )}
              <BookShareMenu slug={b.slug} title={b.title} />
            </div>

            {user && (
              <div className="pt-3 border-t mt-3">
                <p className="text-sm font-medium mb-1.5">Your rating</p>
                <StarRating
                  value={myState.data?.myRating ?? 0}
                  onChange={(v) => rateMut.mutate(v)}
                />
              </div>
            )}
          </div>
        </div>

        {b.description && (
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Description</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown source={b.description} />
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="font-semibold mb-3">Comments</h2>
          {user ? (
            <div className="space-y-2 mb-4">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                placeholder="Share your thoughts about this book…"
                maxLength={5000}
              />
              <Button
                size="sm"
                disabled={!commentText.trim() || addCommentMut.isPending}
                onClick={() => addCommentMut.mutate()}
              >
                {addCommentMut.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                Post
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              <Link to="/login" className="text-primary underline">Sign in</Link> to comment.
            </p>
          )}
          <div className="space-y-4">
            {comments.data?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
            {comments.data?.map((c: any) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{(c.profile?.display_name ?? "?")[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.profile?.display_name ?? "User"}</span>
                    <span>· {new Date(c.created_at).toLocaleDateString()}</span>
                    {user?.id === c.user_id && (
                      <button className="text-destructive ml-auto" onClick={() => delCommentMut.mutate(c.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{c.body_md}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
