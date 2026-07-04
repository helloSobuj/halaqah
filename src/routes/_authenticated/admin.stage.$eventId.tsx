import * as React from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play, Pause, Plus, Minus, SkipForward, X, Megaphone, ArrowLeft, ExternalLink, CheckCircle2, Undo2,
  Maximize2, Minimize2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  getStageState, setCurrentSpeaker, startTimer, pauseTimer, adjustTimer,
  setAnnouncement, listEventQuestions, markQuestionAnsweredOnStage,
} from "@/lib/stage.functions";
import { getEventBySlug } from "@/lib/events.functions";
import { useCountdown, formatTime, bgForRemaining } from "@/components/stage/speaker-timer";

export const Route = createFileRoute("/_authenticated/admin/stage/$eventId")({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) throw redirect({ to: "/login" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const roles = (data ?? []).map((r) => r.role);
    if (!roles.includes("admin") && !roles.includes("moderator")) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({ meta: [{ title: "Stage Control — Halaqah" }, { name: "robots", content: "noindex" }] }),
  component: StageControl,
});

function StageControl() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();
  const stateFn = useServerFn(getStageState);
  const qFn = useServerFn(listEventQuestions);
  const setSpeaker = useServerFn(setCurrentSpeaker);
  const start = useServerFn(startTimer);
  const pause = useServerFn(pauseTimer);
  const adjust = useServerFn(adjustTimer);
  const setAnn = useServerFn(setAnnouncement);
  const markAns = useServerFn(markQuestionAnsweredOnStage);

  // Load event slug + start time so we can link to /live and render absolute times
  const [slug, setSlug] = React.useState<string | null>(null);
  const [startsAt, setStartsAt] = React.useState<string | null>(null);
  React.useEffect(() => {
    supabase.from("events").select("slug,starts_at").eq("id", eventId).maybeSingle().then(({ data }) => {
      setSlug(data?.slug ?? null);
      setStartsAt(data?.starts_at ?? null);
    });
  }, [eventId]);

  const fmtClock = (offsetMin: number) => {
    if (!startsAt) return "";
    const d = new Date(new Date(startsAt).getTime() + offsetMin * 60_000);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const { data: stage } = useQuery({
    queryKey: ["stage-state", eventId],
    queryFn: () => stateFn({ data: { eventId } }),
  });
  const { data: questions = [] } = useQuery({
    queryKey: ["event-questions", eventId],
    queryFn: () => qFn({ data: { eventId } }),
    refetchInterval: 8000,
  });

  React.useEffect(() => {
    const ch = supabase
      .channel(`stage-admin-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_stage_state", filter: `event_id=eq.${eventId}` },
        () => qc.invalidateQueries({ queryKey: ["stage-state", eventId] }),
      )
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

  const invalidate = () => qc.invalidateQueries({ queryKey: ["stage-state", eventId] });
  const err = (e: Error) => toast.error(e.message);

  const mSpeaker = useMutation({ mutationFn: (id: string | null) => setSpeaker({ data: { eventId, speakerId: id } }), onSuccess: invalidate, onError: err });
  const mStart = useMutation({ mutationFn: () => start({ data: { eventId } }), onSuccess: invalidate, onError: err });
  const mPause = useMutation({ mutationFn: () => pause({ data: { eventId } }), onSuccess: invalidate, onError: err });
  const mAdjust = useMutation({ mutationFn: (delta: number) => adjust({ data: { eventId, deltaSeconds: delta } }), onSuccess: invalidate, onError: err });
  const mAnn = useMutation({ mutationFn: (v: { text: string | null; active: boolean }) => setAnn({ data: { eventId, ...v } }), onSuccess: invalidate, onError: err });
  const mMark = useMutation({
    mutationFn: (v: { questionId: string; answered: boolean }) => markAns({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event-questions", eventId] }),
    onError: err,
  });

  const state = stage?.state ?? null;
  const speakers = stage?.speakers ?? [];
  const current = speakers.find((s) => s.id === state?.current_speaker_id) ?? null;
  const currentIdx = current ? speakers.findIndex((s) => s.id === current.id) : -1;
  const next = currentIdx >= 0 ? speakers[currentIdx + 1] ?? null : speakers[0] ?? null;
  const total = (current?.duration_minutes ?? 0) * 60;
  const remaining = useCountdown(state?.timer_started_at ?? null, state?.timer_remaining_seconds ?? 0);
  const running = !!state?.timer_started_at;

  const [annText, setAnnText] = React.useState("");
  const [fullscreen, setFullscreen] = React.useState(false);
  React.useEffect(() => {
    if (state?.announcement_text) setAnnText(state.announcement_text);
  }, [state?.announcement_text]);

  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col overflow-hidden">
      {!fullscreen && (
        <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
          <div className="flex items-center gap-3">
            <Link to="/admin/events" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <h1 className="font-semibold">Stage Control</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFullscreen(true)}>
              <Maximize2 className="h-4 w-4" /> Fullscreen
            </Button>
            {slug && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/events/${slug}/live`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Open Projection
                </a>
              </Button>
            )}
          </div>
        </header>
      )}
      {fullscreen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullscreen(false)}
          className="absolute top-3 right-3 z-50"
        >
          <Minimize2 className="h-4 w-4" /> Exit
        </Button>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
        {/* Main */}
        <main className={`flex flex-col items-center justify-center p-6 lg:p-10 transition-colors ${bgForRemaining(remaining, total)}`}>
          {state?.announcement_active && state.announcement_text ? (
            <div className="text-center">
              <p className="uppercase tracking-widest opacity-70 mb-4">Announcement is live</p>
              <p className="text-4xl lg:text-6xl font-bold">{state.announcement_text}</p>
              <Button className="mt-6" variant="secondary" onClick={() => mAnn.mutate({ text: state.announcement_text, active: false })}>
                Hide Announcement
              </Button>
            </div>
          ) : current ? (
            <>
              <p className="text-lg lg:text-xl uppercase tracking-widest opacity-70">Now Speaking</p>
              <h2 className="text-5xl lg:text-7xl font-black text-center mt-3">
                {current.topic || (current.is_for_child ? current.child_name : current.name)}
              </h2>
              {current.topic && (
                <p className="text-2xl lg:text-3xl mt-3 opacity-90 text-center">
                  {current.is_for_child ? current.child_name : current.name}
                </p>
              )}
              <div className="text-7xl lg:text-[10rem] font-mono font-black tabular-nums mt-6">{formatTime(remaining)}</div>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {running ? (
                  <Button size="lg" variant="secondary" onClick={() => mPause.mutate()}><Pause className="h-5 w-5" /> Pause</Button>
                ) : (
                  <Button size="lg" onClick={() => mStart.mutate()}><Play className="h-5 w-5" /> Start</Button>
                )}
                <Button size="lg" variant="secondary" onClick={() => mAdjust.mutate(60)}><Plus className="h-5 w-5" />1m</Button>
                <Button size="lg" variant="secondary" onClick={() => mAdjust.mutate(-60)}><Minus className="h-5 w-5" />1m</Button>
                <Button size="lg" variant="outline" onClick={() => next && mSpeaker.mutate(next.id)} disabled={!next}>
                  <SkipForward className="h-5 w-5" /> Next
                </Button>
                <Button size="lg" variant="ghost" onClick={() => mSpeaker.mutate(null)}>
                  <X className="h-5 w-5" /> Clear
                </Button>
              </div>
              {next && (
                <p className="mt-6 text-lg opacity-70">
                  Up next: <span className="font-semibold">{next.is_for_child ? next.child_name : next.name}</span>
                  {next.topic ? ` — ${next.topic}` : ""}
                </p>
              )}
            </>
          ) : (
            <div className="text-center opacity-70">
              <p className="text-2xl">No speaker selected.</p>
              <p className="text-sm mt-2">Pick a speaker from the schedule on the right.</p>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-hidden">
          {/* Schedule */}
          <div className="p-4 border-b overflow-auto max-h-[45%]">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Schedule</h3>
            {speakers.length === 0 && <p className="text-sm text-muted-foreground">No speakers.</p>}
            <div className="space-y-1">
              {speakers.map((s) => {
                const active = s.id === state?.current_speaker_id;
                return (
                  <button
                    key={s.id}
                    onClick={() => mSpeaker.mutate(s.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium truncate">
                        {s.is_for_child ? s.child_name : s.name}
                      </span>
                      <span className="opacity-70 shrink-0">+{s.start_minute}m · {s.duration_minutes}m</span>
                    </div>
                    {s.topic && <div className="text-xs opacity-70 truncate">{s.topic}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Q&A */}
          <div className="p-4 flex-1 overflow-auto">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Live Questions ({questions.filter((q) => !q.answered_on_stage_at).length})
            </h3>
            <div className="space-y-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={`p-2 rounded border text-sm ${q.answered_on_stage_at ? "opacity-50 bg-muted/40" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">▲{q.vote_score}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{q.title}</p>
                      {q.author?.display_name && (
                        <p className="text-xs text-muted-foreground">{q.author.display_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex justify-end">
                    {q.answered_on_stage_at ? (
                      <Button size="sm" variant="ghost" onClick={() => mMark.mutate({ questionId: q.id, answered: false })}>
                        <Undo2 className="h-3.5 w-3.5" /> Reopen
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => mMark.mutate({ questionId: q.id, answered: true })}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark answered
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-sm text-muted-foreground">No questions yet.</p>
              )}
            </div>
          </div>

          {/* Announcement */}
          <div className="p-4 border-t bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Announcement</h3>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs">Live</span>
                <Switch
                  checked={!!state?.announcement_active}
                  onCheckedChange={(v) => mAnn.mutate({ text: annText || state?.announcement_text || "", active: v })}
                />
              </div>
            </div>
            <Textarea
              value={annText}
              onChange={(e) => setAnnText(e.target.value)}
              placeholder="e.g. Break — 10 min"
              rows={2}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={() => mAnn.mutate({ text: annText, active: state?.announcement_active ?? false })}>
                Save text
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
