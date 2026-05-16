import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, ShieldCheck, Eye, Trash2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/qa/markdown";
import { MarkdownEditor } from "@/components/qa/markdown-editor";
import {
  getQuestion,
  myVotesForQuestion,
  createAnswer,
  addComment,
  deleteComment,
  acceptAnswer,
  endorseAnswer,
  deleteQuestion,
  deleteAnswer,
} from "@/lib/qa.functions";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { VoteWidget, AuthorChip, CommentList, useInvalidateQuestion } from "@/components/qa/qa-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/qa/$questionId")({
  head: () => ({ meta: [{ title: "Question — Halaqah" }] }),
  component: QuestionDetail,
});

function QuestionDetail() {
  const { questionId } = Route.useParams();
  const { user } = useAuth();
  const { isStaff, isScholar } = useUserRole();
  const getFn = useServerFn(getQuestion);
  const votesFn = useServerFn(myVotesForQuestion);
  const invalidate = useInvalidateQuestion(questionId);

  const q = useQuery({
    queryKey: ["qa-question", questionId],
    queryFn: () => getFn({ data: { id: questionId } }),
  });

  const myVotes = useQuery({
    queryKey: ["qa-my-votes", questionId, q.data?.answers.map((a) => a.id).join(",")],
    queryFn: () =>
      votesFn({
        data: {
          questionId,
          answerIds: q.data?.answers.map((a) => a.id) ?? [],
        },
      }),
    enabled: !!user && !!q.data,
  });

  if (q.isLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32" />
        </div>
      </AppShell>
    );
  }
  if (q.isError || !q.data) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-muted-foreground">
          Question not found. <Link to="/qa" className="text-primary underline">Back to Q&amp;A</Link>
        </div>
      </AppShell>
    );
  }

  const { question, answers } = q.data;
  const getMyVote = (type: "question" | "answer", id: string) =>
    myVotes.data?.[`${type}:${id}`] ?? 0;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <Link to="/qa" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Q&amp;A
        </Link>

        <div>
          <h1 className="text-2xl lg:text-3xl font-bold leading-tight">{question.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {question.viewCount} views</span>
            {question.category && (
              <Badge variant="secondary">{question.category.name_en}</Badge>
            )}
            {question.tags.map((t: any) => (
              <Badge key={t.slug} variant="outline">{t.label}</Badge>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <div className="flex gap-4">
            <VoteWidget
              targetType="question"
              targetId={question.id}
              score={question.voteScore}
              myValue={getMyVote("question", question.id)}
            />
            <div className="flex-1 min-w-0">
              <Body text={question.body} />
              <div className="mt-4 flex items-center justify-between">
                <AuthorChip author={question.author} isAnonymous={question.isAnonymous} createdAt={question.createdAt} label="asked" />
                {user?.id === question.ownerId && (
                  <DeleteQuestionBtn id={question.id} />
                )}
              </div>
              <CommentSection
                parentType="question"
                parentId={question.id}
                comments={question.comments}
                onChange={invalidate}
              />
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-3">
            {answers.length} {answers.length === 1 ? "answer" : "answers"}
          </h2>
          <div className="space-y-4">
            {answers.map((a) => (
              <AnswerCard
                key={a.id}
                a={a}
                myVote={getMyVote("answer", a.id)}
                isAsker={user?.id === question.ownerId}
                canEndorse={isScholar}
                isStaff={isStaff}
                onChange={invalidate}
              />
            ))}
          </div>
        </div>

        <AnswerForm questionId={question.id} onPosted={invalidate} />
      </div>
    </AppShell>
  );
}

function Body({ text }: { text: string }) {
  return <Markdown source={text} />;
}

function DeleteQuestionBtn({ id }: { id: string }) {
  const fn = useServerFn(deleteQuestion);
  const mut = useMutation({
    mutationFn: () => fn({ data: { id } }),
    onSuccess: () => {
      toast.success("Question removed");
      window.location.href = "/qa";
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this question?")) mut.mutate(); }}>
      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
    </Button>
  );
}

function AnswerCard({
  a,
  myVote,
  isAsker,
  canEndorse,
  isStaff,
  onChange,
}: {
  a: any;
  myVote: number;
  isAsker: boolean;
  canEndorse: boolean;
  isStaff: boolean;
  onChange: () => void;
}) {
  const { user } = useAuth();
  const acceptFn = useServerFn(acceptAnswer);
  const endorseFn = useServerFn(endorseAnswer);
  const delFn = useServerFn(deleteAnswer);

  const acceptMut = useMutation({
    mutationFn: () => acceptFn({ data: { answerId: a.id } }),
    onSuccess: () => { toast.success(a.isAccepted ? "Acceptance removed" : "Answer accepted"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const endorseMut = useMutation({
    mutationFn: () => endorseFn({ data: { answerId: a.id } }),
    onSuccess: () => { toast.success(a.isScholarEndorsed ? "Endorsement removed" : "Answer endorsed"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: () => delFn({ data: { id: a.id } }),
    onSuccess: () => { toast.success("Answer removed"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className={cn("p-5", a.isAccepted && "border-emerald-500/50")}>
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <VoteWidget targetType="answer" targetId={a.id} score={a.voteScore} myValue={myVote} />
          {isAsker && (
            <button
              onClick={() => acceptMut.mutate()}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                a.isAccepted ? "bg-emerald-500/15 text-emerald-600" : "hover:bg-accent text-muted-foreground",
              )}
              title={a.isAccepted ? "Remove acceptance" : "Accept this answer"}
            >
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            {a.isAccepted && <Badge className="bg-emerald-500 hover:bg-emerald-500"><Check className="h-3 w-3 mr-1" />Accepted</Badge>}
            {a.isScholarEndorsed && <Badge className="bg-primary"><ShieldCheck className="h-3 w-3 mr-1" />Scholar endorsed</Badge>}
          </div>
          <Body text={a.body} />
          {a.citations?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.citations.map((c: any, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{c.type}: {c.ref}</Badge>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <AuthorChip author={a.author} createdAt={a.createdAt} label="answered" />
            <div className="flex gap-1">
              {canEndorse && (
                <Button variant="ghost" size="sm" onClick={() => endorseMut.mutate()}>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  {a.isScholarEndorsed ? "Unendorse" : "Endorse"}
                </Button>
              )}
              {(user?.id === a.ownerId || isStaff) && (
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete answer?")) delMut.mutate(); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <CommentSection parentType="answer" parentId={a.id} comments={a.comments} onChange={onChange} />
        </div>
      </div>
    </Card>
  );
}

function CommentSection({
  parentType,
  parentId,
  comments,
  onChange,
}: {
  parentType: "question" | "answer";
  parentId: string;
  comments: any[];
  onChange: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const addFn = useServerFn(addComment);
  const delFn = useServerFn(deleteComment);

  const addMut = useMutation({
    mutationFn: () => addFn({ data: { parentType, parentId, body: text.trim() } }),
    onSuccess: () => { setText(""); setOpen(false); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: onChange,
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <CommentList comments={comments} onDelete={(id) => delMut.mutate(id)} />
      {user && (
        <div className="mt-2">
          {open ? (
            <div className="flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
                maxLength={600}
              />
              <Button size="sm" onClick={() => addMut.mutate()} disabled={text.trim().length < 2}>Post</Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          ) : (
            <button onClick={() => setOpen(true)} className="text-xs text-muted-foreground hover:text-foreground">
              Add a comment
            </button>
          )}
        </div>
      )}
    </>
  );
}

function AnswerForm({ questionId, onPosted }: { questionId: string; onPosted: () => void }) {
  const { user } = useAuth();
  const [body, setBody] = React.useState("");
  const fn = useServerFn(createAnswer);
  const mut = useMutation({
    mutationFn: () => fn({ data: { questionId, body: body.trim() } }),
    onSuccess: () => { setBody(""); toast.success("Answer posted"); onPosted(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) {
    return (
      <Card className="p-6 text-center">
        <Link to="/login" className="text-primary underline">Sign in</Link> to post an answer.
      </Card>
    );
  }
  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-semibold">Your answer</h3>
      <MarkdownEditor
        value={body}
        onChange={setBody}
        rows={8}
        placeholder="Write a clear, sourced answer. Markdown and images supported."
      />
      <div className="flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={body.trim().length < 20 || mut.isPending}>
          {mut.isPending ? "Posting…" : "Post your answer"}
        </Button>
      </div>
    </Card>
  );
}
