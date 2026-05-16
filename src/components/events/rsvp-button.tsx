import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Star, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setMyRsvp, getMyRsvp } from "@/lib/events.functions";
import { useAuth } from "@/hooks/use-auth";

export function RsvpButton({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setFn = useServerFn(setMyRsvp);
  const getFn = useServerFn(getMyRsvp);

  const current = useQuery({
    queryKey: ["event-rsvp", eventId],
    queryFn: () => getFn({ data: { eventId } }),
    enabled: !!user,
  });

  const mut = useMutation({
    mutationFn: (status: "going" | "interested" | "cancelled") =>
      setFn({ data: { eventId, status } }),
    onSuccess: (_d, status) => {
      toast.success(
        status === "going"
          ? "You're going!"
          : status === "interested"
            ? "Marked as interested"
            : "RSVP cancelled",
      );
      qc.invalidateQueries({ queryKey: ["event-rsvp", eventId] });
      qc.invalidateQueries({ queryKey: ["event-detail"] });
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

  if (status === "going") {
    return (
      <div className="flex gap-2 w-full sm:w-auto">
        <Button size="lg" variant="default" disabled className="flex-1 sm:flex-none">
          <Check className="h-4 w-4 mr-1.5" /> Going
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => mut.mutate("cancelled")}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  if (status === "interested") {
    return (
      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          size="lg"
          onClick={() => mut.mutate("going")}
          disabled={pending}
          className="flex-1 sm:flex-none"
        >
          {pending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
          I'm going
        </Button>
        <Button size="lg" variant="outline" onClick={() => mut.mutate("cancelled")} disabled={pending}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 w-full sm:w-auto">
      <Button
        size="lg"
        onClick={() => mut.mutate("going")}
        disabled={pending}
        className="flex-1 sm:flex-none"
      >
        {pending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
        Going
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => mut.mutate("interested")}
        disabled={pending}
      >
        <Star className="h-4 w-4 mr-1.5" />
        Interested
      </Button>
    </div>
  );
}
