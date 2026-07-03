import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MessageCircleQuestion, ThumbsUp, CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { askEventQuestion, listEventQuestions } from "@/lib/stage.functions";

export function AskQuestionPanel({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ask = useServerFn(askEventQuestion);
  const listFn = useServerFn(listEventQuestions);
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  const { data: questions = [] } = useQuery({
    queryKey: ["event-questions", eventId],
    queryFn: () => listFn({ data: { eventId } }),
    refetchInterval: 15000,
  });

  React.useEffect(() => {
    const ch = supabase
      .channel(`event-qa-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_questions", filter: `event_id=eq.${eventId}` },
        () => qc.invalidateQueries({ queryKey: ["event-questions", eventId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, qc]);

  const mutation = useMutation({
    mutationFn: () => ask({ data: { eventId, title: title.trim(), body: body.trim() } }),
    onSuccess: () => {
      toast.success("Question submitted");
      setTitle("");
      setBody("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["event-questions", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vote = async (qid: string) => {
    if (!user) {
      toast.error("Sign in to upvote");
      return;
    }
    const { error } = await supabase.rpc("qa_cast_vote", {
      _target_type: "question",
      _target_id: qid,
      _value: 1,
    });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["event-questions", eventId] });
  };

  return (
    <Card id="ask" className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
            Questions for this event
          </h2>
          <p className="text-sm text-muted-foreground">
            Ask anything — organisers may answer live from the stage.
          </p>
        </div>
        {user ? (
          <Button size="lg" onClick={() => setOpen((v) => !v)}>
            Ask a Question
          </Button>
        ) : (
          <Button size="lg" asChild>
            <Link to="/login">Sign in to ask</Link>
          </Button>
        )}
      </div>

      {open && user && (
        <div className="space-y-2 border-t pt-4">
          <Input
            placeholder="Your question (short)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          <Textarea
            placeholder="Add more context (optional)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={title.trim().length < 6 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Be the first to ask a question.
          </p>
        )}
        {questions.map((q) => (
          <div
            key={q.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              q.answered_on_stage_at ? "opacity-60 bg-muted/30" : "bg-background"
            }`}
          >
            <button
              onClick={() => vote(q.id)}
              className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
              title="Upvote"
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="text-xs font-semibold">{q.vote_score}</span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2 flex-wrap">
                <Link
                  to="/qa/$questionId"
                  params={{ questionId: q.id }}
                  className="font-medium text-foreground hover:text-primary line-clamp-2"
                >
                  {q.title}
                </Link>
                {q.answered_on_stage_at && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Answered on stage
                  </Badge>
                )}
              </div>
              {q.author?.display_name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  by {q.author.display_name}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
