import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trophy, Trash2, Play, ArrowLeft, Pencil } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  listTournaments,
  upsertTournament,
  deleteTournament,
  startTournamentBracket,
} from "@/lib/tournament.functions";
import { listQuizzes } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/admin/tournaments")({
  component: AdminTournaments,
});

function AdminTournaments() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const listFn = useServerFn(listTournaments);
  const upsertFn = useServerFn(upsertTournament);
  const deleteFn = useServerFn(deleteTournament);
  const startFn = useServerFn(startTournamentBracket);
  const quizzesFn = useServerFn(listQuizzes);

  const list = useQuery({ queryKey: ["admin-tournaments"], queryFn: () => listFn() });
  const quizzes = useQuery({ queryKey: ["all-quizzes-for-tournaments"], queryFn: () => quizzesFn({ data: { publishedOnly: false } }) });

  const toLocal = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const blankForm = () => ({
    id: undefined as string | undefined,
    quiz_id: "",
    name_en: "",
    name_bn: "",
    description_en: "",
    description_bn: "",
    bracket_size: 8 as 4 | 8 | 16 | 32,
    registration_opens_at: toLocal(new Date().toISOString()),
    registration_closes_at: toLocal(new Date(Date.now() + 86400000).toISOString()),
    starts_at: toLocal(new Date(Date.now() + 90000000).toISOString()),
    round_minutes: 30,
    prize_en: "",
    prize_bn: "",
    status: "open" as "draft" | "open" | "in_progress" | "finished" | "cancelled",
  });
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(blankForm);
  const openNew = () => { setForm(blankForm()); setOpen(true); };
  const openEdit = (t: any) => {
    setForm({
      id: t.id,
      quiz_id: t.quiz_id,
      name_en: t.name_en ?? "",
      name_bn: t.name_bn ?? "",
      description_en: t.description_en ?? "",
      description_bn: t.description_bn ?? "",
      bracket_size: t.bracket_size,
      registration_opens_at: toLocal(t.registration_opens_at),
      registration_closes_at: toLocal(t.registration_closes_at),
      starts_at: toLocal(t.starts_at),
      round_minutes: t.round_minutes ?? 30,
      prize_en: t.prize_en ?? "",
      prize_bn: t.prize_bn ?? "",
      status: t.status ?? "open",
    });
    setOpen(true);
  };

  const upsertMut = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          ...form,
          registration_opens_at: new Date(form.registration_opens_at).toISOString(),
          registration_closes_at: new Date(form.registration_closes_at).toISOString(),
          starts_at: new Date(form.starts_at).toISOString(),
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-tournaments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-tournaments"] });
    },
  });
  const startMut = useMutation({
    mutationFn: (id: string) => startFn({ data: { tournamentId: id } }),
    onSuccess: () => {
      toast.success("Bracket seeded");
      qc.invalidateQueries({ queryKey: ["admin-tournaments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1.5" />Admin</Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2 mt-2"><Trophy className="h-6 w-6 text-primary" /> Tournaments</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />New tournament</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{form.id ? "Edit tournament" : "New tournament"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Quiz</Label>
                  <Select value={form.quiz_id} onValueChange={(v) => setForm((f) => ({ ...f, quiz_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select quiz" /></SelectTrigger>
                    <SelectContent>
                      {(quizzes.data ?? []).map((q: any) => (
                        <SelectItem key={q.id} value={q.id}>{q.title_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Name (EN)</Label><Input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} /></div>
                  <div><Label>Name (BN)</Label><Input value={form.name_bn} onChange={(e) => setForm((f) => ({ ...f, name_bn: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Description (EN)</Label><Textarea value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} /></div>
                  <div><Label>Description (BN)</Label><Textarea value={form.description_bn} onChange={(e) => setForm((f) => ({ ...f, description_bn: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Bracket size</Label>
                    <Select value={String(form.bracket_size)} onValueChange={(v) => setForm((f) => ({ ...f, bracket_size: Number(v) as 4 | 8 | 16 | 32 }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[4, 8, 16, 32].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Round duration (minutes)</Label>
                    <Input type="number" value={form.round_minutes} onChange={(e) => setForm((f) => ({ ...f, round_minutes: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Registration opens</Label><Input type="datetime-local" value={form.registration_opens_at} onChange={(e) => setForm((f) => ({ ...f, registration_opens_at: e.target.value }))} /></div>
                  <div><Label>Registration closes</Label><Input type="datetime-local" value={form.registration_closes_at} onChange={(e) => setForm((f) => ({ ...f, registration_closes_at: e.target.value }))} /></div>
                  <div><Label>Starts at</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Prize (EN)</Label><Input value={form.prize_en} onChange={(e) => setForm((f) => ({ ...f, prize_en: e.target.value }))} /></div>
                  <div><Label>Prize (BN)</Label><Input value={form.prize_bn} onChange={(e) => setForm((f) => ({ ...f, prize_bn: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as typeof f.status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["draft", "open", "in_progress", "finished", "cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => upsertMut.mutate()} disabled={upsertMut.isPending || !form.quiz_id || !form.name_en}>{form.id ? "Save changes" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-3">
          {(list.data ?? []).length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">No tournaments yet.</div>}
          <div className="divide-y divide-border">
            {(list.data ?? []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-3 gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium">{t.name_en}</div>
                  <div className="text-xs text-muted-foreground">{t.bracket_size}-player • {t.participant_count} registered • {new Date(t.starts_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{t.status}</Badge>
                  {(t.status === "open" || t.status === "draft") && t.participant_count >= 2 && (
                    <Button size="sm" variant="outline" onClick={() => startMut.mutate(t.id)} disabled={startMut.isPending}>
                      <Play className="h-3.5 w-3.5 mr-1" />Start
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                  </Button>
                  <Button asChild size="sm" variant="outline"><Link to="/tournaments/$id" params={{ id: t.id }}>View</Link></Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("Delete?") && deleteMut.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
