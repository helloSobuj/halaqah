import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HandHeart, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import {
  registerAsContributor,
  updateMyContribution,
  deleteMyContribution,
  listEventContributions,
  canViewContributions,
  getMyContribution,
  adminUpdateContribution,
  adminDeleteContribution,
} from "@/lib/events.functions";

type ContribRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  contributor_name: string;
  contribution: string;
  details: string | null;
  created_at: string;
};

export function ContributorSection({
  eventId,
  eventSlug,
}: {
  eventId: string;
  eventSlug: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ContribRow | null>(null);
  const [name, setName] = React.useState("");
  const [contribution, setContribution] = React.useState("");
  const [details, setDetails] = React.useState("");

  const regFn = useServerFn(registerAsContributor);
  const updMine = useServerFn(updateMyContribution);
  const delMine = useServerFn(deleteMyContribution);
  const listFn = useServerFn(listEventContributions);
  const canFn = useServerFn(canViewContributions);
  const myFn = useServerFn(getMyContribution);
  const adminUpd = useServerFn(adminUpdateContribution);
  const adminDel = useServerFn(adminDeleteContribution);

  const canViewQ = useQuery({
    queryKey: ["contrib-can-view", eventId, user?.id ?? null],
    queryFn: () => canFn({ data: { eventId } }),
    enabled: !!user,
  });
  const canView = !!canViewQ.data?.allowed;

  const listQ = useQuery({
    queryKey: ["contrib-list", eventId],
    queryFn: () => listFn({ data: { eventId } }),
    enabled: canView,
  });

  const myQ = useQuery({
    queryKey: ["contrib-mine", eventId, user?.id ?? null],
    queryFn: () => myFn({ data: { eventId } }),
    enabled: !!user,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["contrib-list", eventId] });
    qc.invalidateQueries({ queryKey: ["contrib-mine", eventId] });
    qc.invalidateQueries({ queryKey: ["event-detail", eventSlug] });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        contributorName: name.trim(),
        contribution: contribution.trim(),
        details: details.trim(),
      };
      if (editing) {
        // owner edits via updateMyContribution; staff edits any via adminUpdate
        if (editing.user_id === user?.id) {
          return updMine({ data: { id: editing.id, ...payload } });
        }
        return adminUpd({ data: { id: editing.id, ...payload } });
      }
      return regFn({ data: { eventId, ...payload } });
    },
    onSuccess: () => {
      toast.success(editing ? "Contribution updated" : "Jazak Allahu khairan — contribution saved");
      setOpen(false);
      setEditing(null);
      setName("");
      setContribution("");
      setDetails("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async ({ row }: { row: ContribRow }) => {
      if (row.user_id === user?.id) return delMine({ data: { id: row.id } });
      return adminDel({ data: { id: row.id } });
    },
    onSuccess: () => {
      toast.success("Contribution removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    if (!user) {
      toast.error("Please sign in to register as a contributor");
      return;
    }
    setEditing(null);
    setName(user.user_metadata?.display_name ?? "");
    setContribution("");
    setDetails("");
    setOpen(true);
  };

  const openEdit = (row: ContribRow) => {
    setEditing(row);
    setName(row.contributor_name);
    setContribution(row.contribution);
    setDetails(row.details ?? "");
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Contributor name required");
    if (contribution.trim().length < 2) return toast.error("Please describe what you want to contribute");
    saveMut.mutate();
  };

  const myEntries = (myQ.data ?? []) as ContribRow[];
  const rows = (listQ.data ?? []) as ContribRow[];

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="h-10 w-10 rounded-full bg-[#4B8A63]/10 flex items-center justify-center shrink-0">
          <HandHeart className="h-5 w-5 text-[#4B8A63]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Contributors</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Volunteer to contribute to this event — food, supplies, transport, support, etc.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          style={{ backgroundColor: "#4B8A63" }}
          className="text-white hover:opacity-90"
        >
          Register as a Contributor
        </Button>
      </div>

      {user && myEntries.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your contributions
          </p>
          {myEntries.map((row) => (
            <div key={row.id} className="flex items-start gap-2 flex-wrap">
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{row.contribution}</p>
                {row.details && (
                  <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-wrap">
                    {row.details}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Remove this contribution?")) delMut.mutate({ row });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {canView && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            All contributions ({rows.length}) — visible to host & admins only
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No contributions yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contribution</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.contributor_name}</TableCell>
                      <TableCell>{row.contribution}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {row.details || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Delete this contribution?")) delMut.mutate({ row });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit contribution" : "Register as a Contributor"}
            </DialogTitle>
            <DialogDescription>
              Your contribution will be sent to the event host and admins only.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="contrib-name">Contributor name *</Label>
              <Input
                id="contrib-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div>
              <Label htmlFor="contrib-what">What you want to contribute *</Label>
              <Input
                id="contrib-what"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                maxLength={300}
                required
                placeholder="e.g. Meals for 20 people, transportation, sound system"
              />
            </div>
            <div>
              <Label htmlFor="contrib-details">Details information</Label>
              <Textarea
                id="contrib-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Any additional details, contact, timing, etc."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMut.isPending}
                style={{ backgroundColor: "#4B8A63" }}
                className="text-white hover:opacity-90"
              >
                {saveMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {editing ? "Save changes" : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
