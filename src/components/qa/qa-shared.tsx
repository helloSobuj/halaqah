import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Check, ShieldCheck, MessageSquare, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { castVote } from "@/lib/qa.functions";
import { useAuth } from "@/hooks/use-auth";

export function VoteWidget({
  targetType,
  targetId,
  score,
  myValue,
  onChange,
  vertical = true,
}: {
  targetType: "question" | "answer";
  targetId: string;
  score: number;
  myValue: number;
  onChange?: (s: number, v: number) => void;
  vertical?: boolean;
}) {
  const { user } = useAuth();
  const voteFn = useServerFn(castVote);
  const [optimistic, setOptimistic] = React.useState({ score, myValue });
  React.useEffect(() => setOptimistic({ score, myValue }), [score, myValue]);

  const mut = useMutation({
    mutationFn: async (value: -1 | 0 | 1) => voteFn({ data: { targetType, targetId, value } }),
    onSuccess: (res: any) => {
      setOptimistic({ score: res.score, myValue: res.my_value ?? 0 });
      onChange?.(res.score, res.my_value ?? 0);
    },
    onError: (e: any) => toast.error(e.message ?? "Vote failed"),
  });

  const handle = (v: 1 | -1) => {
    if (!user) {
      toast.error("Sign in to vote");
      return;
    }
    mut.mutate(optimistic.myValue === v ? 0 : v);
  };

  return (
    <div className={cn("flex items-center gap-1", vertical && "flex-col")}>
      <button
        type="button"
        onClick={() => handle(1)}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-accent",
          optimistic.myValue === 1 && "bg-primary/15 text-primary",
        )}
        aria-label="Upvote"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <span className="text-sm font-semibold tabular-nums min-w-[1.5ch] text-center">
        {optimistic.score}
      </span>
      <button
        type="button"
        onClick={() => handle(-1)}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-accent",
          optimistic.myValue === -1 && "bg-destructive/15 text-destructive",
        )}
        aria-label="Downvote"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AuthorChip({
  author,
  isAnonymous,
  createdAt,
  label,
}: {
  author: { id: string; name?: string | null; avatar?: string | null; rep?: number; isScholar?: boolean } | null;
  isAnonymous?: boolean;
  createdAt: string;
  label?: string;
}) {
  if (isAnonymous || !author) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-6 w-6 rounded-full bg-muted" />
        <span>Anonymous · {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      <Avatar className="h-6 w-6">
        <AvatarImage src={author.avatar ?? undefined} />
        <AvatarFallback>{(author.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-tight">
        <span className="font-medium text-foreground inline-flex items-center gap-1">
          {author.name ?? "User"}
          {author.isScholar && (
            <ShieldCheck className="h-3 w-3 text-primary" aria-label="Verified scholar" />
          )}
        </span>
        <span className="text-muted-foreground">
          {label ? `${label} · ` : ""}{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          {typeof author.rep === "number" && ` · ${author.rep} rep`}
        </span>
      </div>
    </div>
  );
}

export function QuestionRow({ q }: { q: any }) {
  return (
    <Link
      to="/qa/$questionId"
      params={{ questionId: q.id }}
      className="block rounded-xl border bg-card p-4 hover:border-primary/40 hover:bg-accent/40 transition-colors"
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground min-w-[60px]">
          <span className="font-semibold text-foreground tabular-nums">{q.voteScore}</span>
          <span>votes</span>
          <span className={cn("font-semibold tabular-nums mt-1", q.accepted && "text-emerald-600")}>
            {q.answerCount}
          </span>
          <span className="inline-flex items-center gap-0.5">
            {q.accepted && <Check className="h-3 w-3 text-emerald-600" />}answers
          </span>
          <span className="font-semibold tabular-nums mt-1">{q.viewCount}</span>
          <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />views</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-2">{q.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{q.excerpt}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {q.category && (
              <Badge variant="secondary" className="text-xs">{q.category.name_en}</Badge>
            )}
            {q.tags.map((t: any) => (
              <Badge key={t.slug} variant="outline" className="text-xs">{t.label}</Badge>
            ))}
            <div className="flex-1" />
            <AuthorChip author={q.author} isAnonymous={q.isAnonymous} createdAt={q.createdAt} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CommentList({
  comments,
  onDelete,
}: {
  comments: any[];
  onDelete?: (id: string) => void;
}) {
  const { user } = useAuth();
  if (!comments.length) return null;
  return (
    <div className="mt-3 space-y-1.5 border-t pt-2">
      {comments.map((c) => (
        <div key={c.id} className="text-xs text-muted-foreground flex items-start gap-2">
          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="text-foreground">{c.body}</span>{" "}
            <span>— {c.author?.name ?? "User"}, {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
          </div>
          {onDelete && user?.id === c.ownerId && (
            <button onClick={() => onDelete(c.id)} className="text-destructive hover:underline">delete</button>
          )}
        </div>
      ))}
    </div>
  );
}

export function useInvalidateQuestion(id: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["qa-question", id] });
    qc.invalidateQueries({ queryKey: ["qa-list"] });
  };
}
