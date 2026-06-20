import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mic, Loader2, Pencil, Trash2, UserPlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import {
  listEventSpeakers,
  registerAsSpeaker,
  updateMySpeakerEntry,
  deleteMySpeakerEntry,
  adminUpsertSpeaker,
  adminDeleteSpeaker,
} from "@/lib/events.functions";

const SLOT = 5;
const MIN_DURATION = 5;
const MAX_DURATION = 45;

export type SpeakerRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  topic: string;
  start_minute: number;
  duration_minutes: number;
  is_for_child: boolean;
  child_name: string | null;
};

function fmtTime(eventStart: Date, minute: number) {
  const d = new Date(eventStart.getTime() + minute * 60_000);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function rangeLabel(eventStart: Date, start: number, duration: number) {
  return `${fmtTime(eventStart, start)} – ${fmtTime(eventStart, start + duration)}`;
}

export function SpeakerSection({
  eventId,
  eventSlug,
  eventStartsAt,
  eventEndsAt,
}: {
  eventId: string;
  eventSlug: string;
  eventStartsAt: string;
  eventEndsAt: string | null;
}) {
  const { user } = useAuth();
  const { isStaff } = useUserRole();
  const qc = useQueryClient();
  const listFn = useServerFn(listEventSpeakers);
  const { data: speakers = [] } = useQuery({
    queryKey: ["event-speakers", eventId],
    queryFn: () => listFn({ data: { eventId } }),
  });

  const [dialog, setDialog] = React.useState<
    | { mode: "create" }
    | { mode: "edit-mine"; row: SpeakerRow }
    | { mode: "admin-create" }
    | { mode: "admin-edit"; row: SpeakerRow }
    | null
  >(null);
  const [deleteRow, setDeleteRow] = React.useState<SpeakerRow | null>(null);

  const delMineFn = useServerFn(deleteMySpeakerEntry);
  const delAdminFn = useServerFn(adminDeleteSpeaker);

  const delMut = useMutation({
    mutationFn: async () => {
      if (!deleteRow) return;
      const isMine = deleteRow.user_id && deleteRow.user_id === user?.id;
      if (isMine && !isStaff) await delMineFn({ data: { id: deleteRow.id } });
      else await delAdminFn({ data: { id: deleteRow.id } });
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["event-speakers", eventId] });
      qc.invalidateQueries({ queryKey: ["my-speaker-entries"] });
      setDeleteRow(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eventStart = React.useMemo(() => new Date(eventStartsAt), [eventStartsAt]);
  const totalMinutes = React.useMemo(() => {
    if (eventEndsAt) {
      const diff = Math.floor((new Date(eventEndsAt).getTime() - eventStart.getTime()) / 60_000);
      return Math.max(60, Math.min(720, diff));
    }
    return 240;
  }, [eventEndsAt, eventStart]);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Mic className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">Speakers & Participants</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Book a 5–45 minute time block to speak or present at this event.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isStaff && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog({ mode: "admin-create" })}
            >
              <UserPlus2 className="h-4 w-4 mr-1.5" /> Add (admin)
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              if (!user) return toast.error("Please sign in to register");
              setDialog({ mode: "create" });
            }}
            style={{ backgroundColor: "#4B8A63" }}
            className="text-white hover:opacity-90"
          >
            <Mic className="h-4 w-4 mr-1.5" />
            Register as a Speaker
          </Button>
        </div>
      </div>

      {speakers.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Topic</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Time block</th>
                <th className="px-3 py-2 w-[1%]"></th>
              </tr>
            </thead>
            <tbody>
              {speakers.map((s: SpeakerRow) => {
                const mine = !!s.user_id && s.user_id === user?.id;
                const canEdit = mine || isStaff;
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {s.is_for_child && s.child_name ? s.child_name : s.name}
                      </div>
                    </td>
                    <td className="px-3 py-2">{s.topic}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {rangeLabel(eventStart, s.start_minute, s.duration_minutes)}
                      <div className="text-xs text-muted-foreground">
                        {s.duration_minutes} min
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setDialog(
                                mine && !isStaff
                                  ? { mode: "edit-mine", row: s }
                                  : { mode: "admin-edit", row: s },
                              )
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteRow(s)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-3">
          No speakers registered yet. Be the first!
        </p>
      )}

      {dialog && (
        <SpeakerDialog
          mode={dialog.mode}
          row={"row" in dialog ? dialog.row : undefined}
          eventId={eventId}
          eventStart={eventStart}
          totalMinutes={totalMinutes}
          existing={speakers as SpeakerRow[]}
          isStaff={isStaff}
          onClose={() => setDialog(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["event-speakers", eventId] });
            qc.invalidateQueries({ queryKey: ["my-speaker-entries"] });
            qc.invalidateQueries({ queryKey: ["event-detail", eventSlug] });
            setDialog(null);
          }}
        />
      )}

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this registration?</AlertDialogTitle>
            <AlertDialogDescription>
              The time block will be freed up for someone else to book.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => delMut.mutate()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SpeakerDialog({
  mode,
  row,
  eventId,
  eventStart,
  totalMinutes,
  existing,
  isStaff,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit-mine" | "admin-create" | "admin-edit";
  row?: SpeakerRow;
  eventId: string;
  eventStart: Date;
  totalMinutes: number;
  existing: SpeakerRow[];
  isStaff: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = React.useState(
    row?.name ?? (user?.user_metadata?.display_name ?? ""),
  );
  const [topic, setTopic] = React.useState(row?.topic ?? "");
  const [isForChild, setIsForChild] = React.useState(row?.is_for_child ?? false);
  const [childName, setChildName] = React.useState(row?.child_name ?? "");
  const [duration, setDuration] = React.useState<number>(row?.duration_minutes ?? 15);
  const [startMinute, setStartMinute] = React.useState<number | null>(
    row?.start_minute ?? null,
  );

  const regFn = useServerFn(registerAsSpeaker);
  const updMineFn = useServerFn(updateMySpeakerEntry);
  const adminFn = useServerFn(adminUpsertSpeaker);

  const slots = React.useMemo(() => {
    const arr: number[] = [];
    for (let m = 0; m < totalMinutes; m += SLOT) arr.push(m);
    return arr;
  }, [totalMinutes]);

  // For each slot, is it booked by someone else (excluding current row)
  const bookedSet = React.useMemo(() => {
    const s = new Set<number>();
    for (const r of existing) {
      if (row && r.id === row.id) continue;
      for (let m = r.start_minute; m < r.start_minute + r.duration_minutes; m += SLOT) {
        s.add(m);
      }
    }
    return s;
  }, [existing, row]);

  // Selected range slots
  const selectedSet = React.useMemo(() => {
    const s = new Set<number>();
    if (startMinute === null) return s;
    for (let m = startMinute; m < startMinute + duration; m += SLOT) s.add(m);
    return s;
  }, [startMinute, duration]);

  // Valid start positions = no booked slot in [start, start+duration)
  function isValidStart(start: number): boolean {
    if (start + duration > totalMinutes) return false;
    for (let m = start; m < start + duration; m += SLOT) {
      if (bookedSet.has(m)) return false;
    }
    return true;
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (startMinute === null) throw new Error("Please select a time block");
      const payload = {
        name: name.trim(),
        topic: topic.trim(),
        startMinute,
        durationMinutes: duration,
        isForChild,
        childName: isForChild ? childName.trim() : null,
      };
      if (mode === "admin-create" || mode === "admin-edit") {
        await adminFn({
          data: { ...payload, eventId, id: mode === "admin-edit" ? row!.id : undefined },
        });
      } else if (mode === "edit-mine") {
        await updMineFn({ data: { ...payload, id: row!.id } });
      } else {
        await regFn({ data: { ...payload, eventId } });
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Name required");
    if (topic.trim().length < 2) return toast.error("Topic required");
    if (isForChild && childName.trim().length < 2) return toast.error("Child name required");
    if (startMinute === null) return toast.error("Please select a start time");
    mut.mutate();
  };

  const title =
    mode === "edit-mine" || mode === "admin-edit"
      ? "Edit registration"
      : mode === "admin-create"
        ? "Add speaker (admin)"
        : "Register as a Speaker";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick a duration, then click a start time. Red blocks are already booked.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sp-name">Name *</Label>
              <Input id="sp-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            </div>
            <div>
              <Label htmlFor="sp-duration">Duration (minutes) *</Label>
              <select
                id="sp-duration"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={duration}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDuration(v);
                  // If current start no longer valid, clear
                  if (startMinute !== null) {
                    for (let m = startMinute; m < startMinute + v; m += SLOT) {
                      if (bookedSet.has(m) || m >= totalMinutes) {
                        setStartMinute(null);
                        break;
                      }
                    }
                  }
                }}
              >
                {Array.from({ length: (MAX_DURATION - MIN_DURATION) / SLOT + 1 }, (_, i) => MIN_DURATION + i * SLOT).map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="sp-topic">Topic *</Label>
            <Textarea
              id="sp-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={300}
              rows={2}
              required
              placeholder="What will you speak about?"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={isForChild}
              onCheckedChange={(c) => setIsForChild(c === true)}
            />
            Register on behalf of my child
          </label>
          {isForChild && (
            <div>
              <Label htmlFor="sp-child">Child name *</Label>
              <Input
                id="sp-child"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                maxLength={120}
                required
              />
            </div>
          )}

          <div>
            <Label>Select start time *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Each block is 5 minutes. Selected duration: {duration} min.
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-64 overflow-y-auto p-2 rounded-md border bg-muted/30">
              {slots.map((m) => {
                const booked = bookedSet.has(m);
                const selected = selectedSet.has(m);
                const validStart = isValidStart(m);
                return (
                  <button
                    type="button"
                    key={m}
                    disabled={booked || !validStart}
                    onClick={() => setStartMinute(m)}
                    title={fmtTime(eventStart, m)}
                    className={cn(
                      "h-9 rounded text-xs font-medium border transition",
                      booked && "bg-red-500/15 text-red-700 border-red-300 cursor-not-allowed",
                      !booked && !validStart && "bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-50",
                      !booked && validStart && !selected && "bg-background hover:border-blue-500 border-border",
                      selected && "bg-blue-600 text-white border-blue-700",
                    )}
                  >
                    {fmtTime(eventStart, m)}
                  </button>
                );
              })}
            </div>
            {startMinute !== null && (
              <p className="text-sm mt-2">
                Selected: <span className="font-medium">{rangeLabel(eventStart, startMinute, duration)}</span>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={mut.isPending || startMinute === null}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {mode === "edit-mine" || mode === "admin-edit" ? "Save" : "Confirm Registration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
