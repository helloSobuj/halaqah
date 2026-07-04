import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Star, X, Loader2, Minus, Plus, PartyPopper, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setMyRsvp, getMyRsvp } from "@/lib/events.functions";
import { useAuth } from "@/hooks/use-auth";

const MAX_GUESTS = 10;

export function RsvpButton({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setFn = useServerFn(setMyRsvp);
  const getFn = useServerFn(getMyRsvp);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [guests, setGuests] = React.useState(0);

  const current = useQuery({
    queryKey: ["event-rsvp", eventId],
    queryFn: () => getFn({ data: { eventId } }),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (current.data?.guest_count != null) setGuests(current.data.guest_count);
  }, [current.data?.guest_count]);

  const mut = useMutation({
    mutationFn: (vars: {
      status: "going" | "interested" | "cancelled";
      guest_count?: number;
    }) => setFn({ data: { eventId, ...vars } }),
    onSuccess: (_d, vars) => {
      if (vars.status === "going") {
        setDialogOpen(true);
      } else {
        toast.success(
          vars.status === "interested" ? "Marked as interested" : "RSVP cancelled",
        );
      }
      qc.invalidateQueries({ queryKey: ["event-rsvp", eventId] });
      qc.invalidateQueries({ queryKey: ["event-detail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveGuests = useMutation({
    mutationFn: (count: number) =>
      setFn({ data: { eventId, status: "going", guest_count: count } }),
    onSuccess: () => {
      toast.success("Guest count updated");
      qc.invalidateQueries({ queryKey: ["event-rsvp", eventId] });
      qc.invalidateQueries({ queryKey: ["event-detail"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <Button
        size="lg"
        onClick={() => navigate({ to: "/login" })}
        className="w-full sm:w-auto"
      >
        Sign in to RSVP
      </Button>
    );
  }

  const status = current.data?.status;
  const pending = mut.isPending;
  const currentGuests = current.data?.guest_count ?? 0;

  const dialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" />
            Booking successful
          </DialogTitle>
          <DialogDescription>
            You're going! Do you have any guests joining you? You can bring up to {MAX_GUESTS}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-muted-foreground" />
            Guests
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setGuests((g) => Math.max(0, g - 1))}
              disabled={guests <= 0 || saveGuests.isPending}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-lg font-semibold tabular-nums">
              {guests}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setGuests((g) => Math.min(MAX_GUESTS, g + 1))}
              disabled={guests >= MAX_GUESTS || saveGuests.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Total attendees from you: <span className="font-medium text-foreground">{guests + 1}</span>
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={saveGuests.isPending}
          >
            Skip
          </Button>
          <Button
            onClick={() => saveGuests.mutate(guests)}
            disabled={saveGuests.isPending}
          >
            {saveGuests.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (status === "going") {
    return (
      <>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            size="lg"
            variant="default"
            onClick={() => {
              setGuests(currentGuests);
              setDialogOpen(true);
            }}
            className="flex-1 sm:flex-none"
          >
            <Check className="h-4 w-4 mr-1.5" /> Going
            {currentGuests > 0 && (
              <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                +{currentGuests}
              </span>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => mut.mutate({ status: "cancelled" })}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
        {dialog}
      </>
    );
  }

  if (status === "interested") {
    return (
      <>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            size="lg"
            onClick={() => mut.mutate({ status: "going", guest_count: 0 })}
            disabled={pending}
            className="flex-1 sm:flex-none"
          >
            {pending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
            I'm going
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => mut.mutate({ status: "cancelled" })}
            disabled={pending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {dialog}
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          size="lg"
          onClick={() => mut.mutate({ status: "going", guest_count: 0 })}
          disabled={pending}
          className="flex-1 sm:flex-none"
        >
          {pending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
          Going
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => mut.mutate({ status: "interested" })}
          disabled={pending}
        >
          <Star className="h-4 w-4 mr-1.5" />
          Interested
        </Button>
      </div>
      {dialog}
    </>
  );
}
