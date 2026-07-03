import * as React from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getEventBySlug } from "@/lib/events.functions";
import { getStageState, listEventQuestions } from "@/lib/stage.functions";
import { supabase } from "@/integrations/supabase/client";
import { useCountdown, formatTime, bgForRemaining } from "@/components/stage/speaker-timer";

export const Route = createFileRoute("/events/$slug/live")({
  loader: async ({ params }) => {
    try {
      const ev = await getEventBySlug({ data: { slug: params.slug } });
      return ev;
    } catch {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      { title: "Live — Halaqah" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => <FallbackScreen msg="Could not load live view." />,
  notFoundComponent: () => <FallbackScreen msg="Event not found." />,
  component: LiveScreen,
});

function FallbackScreen({ msg }: { msg: string }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
      <p className="text-xl">{msg}</p>
    </div>
  );
}

function LiveScreen() {
  const initial = Route.useLoaderData();
  const params = Route.useParams();
  const eventId = initial.event.id;
  const qc = useQueryClient();
  const stateFn = useServerFn(getStageState);
  const qFn = useServerFn(listEventQuestions);

  const { data: stage } = useQuery({
    queryKey: ["stage-state", eventId],
    queryFn: () => stateFn({ data: { eventId } }),
    refetchInterval: 5000,
  });
  const { data: questions = [] } = useQuery({
    queryKey: ["event-questions", eventId],
    queryFn: () => qFn({ data: { eventId } }),
    refetchInterval: 8000,
  });

  React.useEffect(() => {
    const ch = supabase
      .channel(`stage-live-${eventId}`)
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

  const state = stage?.state ?? null;
  const speakers = stage?.speakers ?? [];
  const current = speakers.find((s) => s.id === state?.current_speaker_id) ?? null;
  const currentIdx = current ? speakers.findIndex((s) => s.id === current.id) : -1;
  const next = currentIdx >= 0 ? speakers[currentIdx + 1] ?? null : speakers[0] ?? null;
  const total = (current?.duration_minutes ?? 0) * 60;
  const remaining = useCountdown(state?.timer_started_at ?? null, state?.timer_remaining_seconds ?? 0);

  if (state?.announcement_active && state.announcement_text) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-primary text-primary-foreground p-10">
        <p className="text-5xl md:text-8xl font-bold text-center leading-tight">
          {state.announcement_text}
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-background text-foreground overflow-hidden">
      <main
        className={`flex-1 flex flex-col items-center justify-center p-6 md:p-12 transition-colors ${bgForRemaining(remaining, total)}`}
      >
        {current ? (
          <>
            <p className="text-lg md:text-2xl uppercase tracking-widest opacity-70">Now Speaking</p>
            <h1 className="text-5xl md:text-8xl font-black text-center mt-4">
              {current.is_for_child ? current.child_name : current.name}
            </h1>
            {current.topic && (
              <p className="text-2xl md:text-4xl mt-4 text-center opacity-90">{current.topic}</p>
            )}
            <div className="text-8xl md:text-[12rem] font-mono font-black tabular-nums mt-8">
              {formatTime(remaining)}
            </div>
            {next && (
              <p className="mt-6 text-lg md:text-2xl opacity-70">
                Up next: <span className="font-semibold">{next.is_for_child ? next.child_name : next.name}</span>
                {next.topic ? ` — ${next.topic}` : ""}
              </p>
            )}
          </>
        ) : (
          <div className="text-center opacity-70">
            <p className="text-3xl md:text-5xl font-semibold">
              {initial.event.title_en}
            </p>
            <p className="mt-4 text-lg">Waiting for the event to begin…</p>
          </div>
        )}
      </main>

      <aside className="w-full md:w-96 border-t md:border-t-0 md:border-l border-border bg-card flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm uppercase tracking-wider opacity-70">Schedule</h3>
          <div className="mt-2 space-y-1 max-h-48 overflow-auto">
            {speakers.map((s) => (
              <div
                key={s.id}
                className={`text-sm px-2 py-1 rounded ${
                  s.id === state?.current_speaker_id ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                <span className="opacity-70 mr-2">+{s.start_minute}m</span>
                <span className="font-medium">{s.is_for_child ? s.child_name : s.name}</span>
              </div>
            ))}
            {speakers.length === 0 && (
              <p className="text-xs text-muted-foreground">No speakers scheduled.</p>
            )}
          </div>
        </div>
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <h3 className="font-semibold text-sm uppercase tracking-wider opacity-70">Live Questions</h3>
          <div className="mt-2 space-y-2 overflow-auto flex-1">
            {questions.filter((q) => !q.answered_on_stage_at).slice(0, 15).map((q) => (
              <div key={q.id} className="flex gap-2 items-start text-sm">
                <span className="font-bold text-primary shrink-0 w-6 text-right">▲{q.vote_score}</span>
                <span className="min-w-0">{q.title}</span>
              </div>
            ))}
            {questions.filter((q) => !q.answered_on_stage_at).length === 0 && (
              <p className="text-xs text-muted-foreground">No live questions yet.</p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
            Ask at <span className="font-mono">/events/{params.slug}#ask</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
