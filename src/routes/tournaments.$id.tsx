import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trophy, Users, ArrowLeft, Crown, Play } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  getTournament,
  joinTournament,
  leaveTournament,
  getMyActiveMatch,
} from "@/lib/tournament.functions";
import { formatInTz } from "@/lib/timezone";

export const Route = createFileRoute("/tournaments/$id")({
  component: TournamentDetail,
});

function TournamentDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const qc = useQueryClient();
  const getFn = useServerFn(getTournament);
  const joinFn = useServerFn(joinTournament);
  const leaveFn = useServerFn(leaveTournament);
  const matchFn = useServerFn(getMyActiveMatch);

  const q = useQuery({
    queryKey: ["tournament", id],
    queryFn: () => getFn({ data: { id } }),
    refetchInterval: 30_000,
  });
  const myMatch = useQuery({
    queryKey: ["my-match", id],
    queryFn: () => matchFn({ data: { tournamentId: id } }),
    enabled: !!user && q.data?.tournament.status === "in_progress",
    refetchInterval: 30_000,
  });

  const joinMut = useMutation({
    mutationFn: () => joinFn({ data: { tournamentId: id } }),
    onSuccess: () => {
      toast.success(t("tournaments.joined", { defaultValue: "Registered!" }));
      qc.invalidateQueries({ queryKey: ["tournament", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const leaveMut = useMutation({
    mutationFn: () => leaveFn({ data: { tournamentId: id } }),
    onSuccess: () => {
      toast.success(t("tournaments.left", { defaultValue: "Withdrawn" }));
      qc.invalidateQueries({ queryKey: ["tournament", id] });
    },
  });

  if (q.isLoading) return <AppShell><div className="p-8"><Skeleton className="h-64 rounded-xl" /></div></AppShell>;
  if (!q.data) return <AppShell><div className="p-8">Not found</div></AppShell>;

  const { tournament, participants, matches, profiles } = q.data as any;
  const name = isBn ? tournament.name_bn : tournament.name_en;
  const desc = isBn ? tournament.description_bn : tournament.description_en;
  const tz = tournament.quizzes?.timezone || "UTC";
  const isParticipant = participants.some((p: any) => p.user_id === user?.id);
  const myReg = participants.find((p: any) => p.user_id === user?.id);
  const canJoin = tournament.status === "open" && !isParticipant && participants.length < tournament.bracket_size;
  const canLeave = isParticipant && myReg?.status === "registered";

  // group matches by round
  const rounds: Record<number, any[]> = {};
  for (const m of matches) {
    rounds[m.round] = rounds[m.round] ?? [];
    rounds[m.round].push(m);
  }
  const roundKeys = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/tournaments"><ArrowLeft className="h-4 w-4 mr-1.5" />{t("common.back", { defaultValue: "Back" })}</Link>
        </Button>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <Trophy className="h-4 w-4" /> {tournament.bracket_size}-{t("tournaments.bracket", { defaultValue: "player bracket" })}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mt-1">{name}</h1>
              {desc && <p className="text-muted-foreground mt-2 max-w-2xl">{desc}</p>}
            </div>
            <Badge>{tournament.status}</Badge>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-5 text-sm">
            <div>
              <div className="text-muted-foreground">{t("tournaments.starts", { defaultValue: "Starts" })}</div>
              <div className="font-medium">{formatInTz(tournament.starts_at, tz, isBn ? "bn-BD" : "en-US")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("tournaments.regCloses", { defaultValue: "Registration closes" })}</div>
              <div className="font-medium">{formatInTz(tournament.registration_closes_at, tz, isBn ? "bn-BD" : "en-US")}</div>
            </div>
            <div>
              <div className="text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t("tournaments.participants", { defaultValue: "Participants" })}</div>
              <div className="font-medium">{participants.length} / {tournament.bracket_size}</div>
            </div>
          </div>

          {tournament.winner_user_id && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-semibold">{profiles[tournament.winner_user_id]?.display_name ?? "—"}</span>
              <span className="text-sm text-muted-foreground">{t("tournaments.champion", { defaultValue: "is the champion" })}</span>
            </div>
          )}

          <div className="mt-5 flex gap-2 flex-wrap">
            {canJoin && (
              <Button onClick={() => joinMut.mutate()} disabled={joinMut.isPending}>
                {t("tournaments.join", { defaultValue: "Register" })}
              </Button>
            )}
            {canLeave && (
              <Button variant="outline" onClick={() => leaveMut.mutate()} disabled={leaveMut.isPending}>
                {t("tournaments.leave", { defaultValue: "Withdraw" })}
              </Button>
            )}
            {myMatch.data && tournament.status === "in_progress" && (
              <Button asChild>
                <Link to="/quiz/play/$quizId" params={{ quizId: tournament.quiz_id }} search={{ matchId: myMatch.data.id } as any}>
                  <Play className="h-4 w-4 mr-1.5" />
                  {t("tournaments.playMatch", { defaultValue: "Play your match" })} (R{myMatch.data.round})
                </Link>
              </Button>
            )}
          </div>
        </Card>

        {/* Bracket */}
        {matches.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">{t("tournaments.bracketTitle", { defaultValue: "Bracket" })}</h2>
            <div className="overflow-x-auto pb-3">
              <div className="flex gap-6 min-w-max">
                {roundKeys.map((r) => (
                  <div key={r} className="flex flex-col gap-3 min-w-[220px]">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {r === roundKeys[roundKeys.length - 1]
                        ? t("tournaments.final", { defaultValue: "Final" })
                        : `${t("tournaments.round", { defaultValue: "Round" })} ${r}`}
                    </div>
                    <div className="flex flex-col gap-3 justify-around flex-1">
                      {rounds[r].map((m: any) => (
                        <Card key={m.id} className="p-3 text-sm">
                          <MatchPlayer
                            userId={m.p1_user_id}
                            score={m.p1_score}
                            isWinner={m.winner_user_id === m.p1_user_id}
                            profiles={profiles}
                          />
                          <div className="my-1 border-t border-dashed border-border" />
                          <MatchPlayer
                            userId={m.p2_user_id}
                            score={m.p2_score}
                            isWinner={m.winner_user_id === m.p2_user_id}
                            profiles={profiles}
                          />
                          {m.status === "bye" && (
                            <div className="text-xs text-muted-foreground mt-1.5">{t("tournaments.bye", { defaultValue: "Bye" })}</div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-3">{t("tournaments.participants", { defaultValue: "Participants" })}</h2>
            <Card className="p-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {participants.map((p: any) => (
                  <div key={p.user_id} className="flex items-center gap-2 text-sm py-1">
                    <span className="font-medium">{p.profiles?.display_name ?? "—"}</span>
                    {p.status === "winner" && <Crown className="h-3.5 w-3.5 text-primary" />}
                    {p.status === "eliminated" && <span className="text-xs text-muted-foreground">eliminated</span>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MatchPlayer({
  userId,
  score,
  isWinner,
  profiles,
}: {
  userId: string | null;
  score: number | null;
  isWinner: boolean;
  profiles: Record<string, { display_name: string | null }>;
}) {
  const name = userId ? profiles[userId]?.display_name ?? "—" : "—";
  return (
    <div className={`flex items-center justify-between gap-2 ${isWinner ? "font-bold text-primary" : ""}`}>
      <span className="truncate">{name}</span>
      <span className="tabular-nums text-xs">{score ?? "–"}</span>
    </div>
  );
}
