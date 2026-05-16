import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, MessageCircle } from "lucide-react";
import { listBlogComments, addBlogComment, deleteBlogComment } from "@/lib/blog.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { Markdown } from "@/components/shared/markdown";
import { Link } from "@tanstack/react-router";

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body_md: string;
  created_at: string;
  author?: { id: string; display_name: string | null; avatar_url: string | null } | null;
};

export function Comments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listBlogComments);
  const addFn = useServerFn(addBlogComment);
  const delFn = useServerFn(deleteBlogComment);

  const [body, setBody] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [replyBody, setReplyBody] = React.useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["blog-comments", postId],
    queryFn: () => listFn({ data: { postId } }) as Promise<Comment[]>,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["blog-comments", postId] });

  const addMut = useMutation({
    mutationFn: (vars: { body: string; parentId?: string | null }) =>
      addFn({ data: { postId, body: vars.body, parentId: vars.parentId ?? null } }),
    onSuccess: () => { invalidate(); setBody(""); setReplyBody(""); setReplyTo(null); toast.success("Posted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const tree = React.useMemo(() => {
    const map = new Map<string, Comment & { children: Comment[] }>();
    comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: (Comment & { children: Comment[] })[] = [];
    map.forEach((c) => {
      if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children.push(c);
      else roots.push(c);
    });
    return roots;
  }, [comments]);

  const renderComment = (c: Comment & { children: Comment[] }, depth = 0) => (
    <div key={c.id} className={depth ? "ml-6 mt-3 pl-4 border-l border-border" : ""}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={c.author?.avatar_url ?? undefined} />
          <AvatarFallback>{(c.author?.display_name ?? "?").slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{c.author?.display_name ?? "User"}</span>
            <span>·</span>
            <span>{new Date(c.created_at).toLocaleDateString()}</span>
          </div>
          <div className="mt-1"><Markdown source={c.body_md} /></div>
          <div className="flex items-center gap-2 mt-1">
            {user && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
                Reply
              </Button>
            )}
            {user?.id === c.user_id && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive"
                onClick={() => delMut.mutate(c.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          {replyTo === c.id && (
            <div className="mt-2 space-y-2">
              <MarkdownEditor value={replyBody} onChange={setReplyBody} rows={3} mediaBucket="blog-media" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addMut.mutate({ body: replyBody, parentId: c.id })} disabled={!replyBody.trim() || addMut.isPending}>Reply</Button>
                <Button size="sm" variant="outline" onClick={() => { setReplyTo(null); setReplyBody(""); }}>Cancel</Button>
              </div>
            </div>
          )}
          {c.children.map((child) => renderComment(child as any, depth + 1))}
        </div>
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <MessageCircle className="h-5 w-5" /> Comments ({comments.length})
      </h2>
      {user ? (
        <div className="space-y-2">
          <MarkdownEditor value={body} onChange={setBody} rows={4} placeholder="Share your thoughts…" mediaBucket="blog-media" />
          <Button onClick={() => addMut.mutate({ body })} disabled={!body.trim() || addMut.isPending}>Post comment</Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Sign in</Link> to leave a comment.
        </p>
      )}
      <div className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
          tree.length ? tree.map((c) => renderComment(c)) :
          <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>}
      </div>
    </section>
  );
}
