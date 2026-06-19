import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Home, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { registerAsHost } from "@/lib/events.functions";

const AGREEMENT_EN =
  "I am volunteering to serve as the host of this event for the sake of Almighty Allah. I will take responsibility for the accommodation arrangements and the overall coordination and management of the event.";
const AGREEMENT_BN =
  "আমি মহান আল্লাহর সন্তুষ্টির জন্য এই অনুষ্ঠানের আয়োজক হিসেবে স্বেচ্ছায় দায়িত্ব নিতে চাই। অংশগ্রহণকারীদের আবাসনের ব্যবস্থা এবং অনুষ্ঠানের সার্বিক আয়োজন ও ব্যবস্থাপনার দায়িত্ব আমি গ্রহণ করব।";

export function HostRegistration({
  eventId,
  eventSlug,
  host,
}: {
  eventId: string;
  eventSlug: string;
  host: {
    host_user_id: string | null;
    host_name: string | null;
    host_address: string | null;
    host_capacity: number | null;
  };
  allowRegistration: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(user?.user_metadata?.display_name ?? "");
  const [address, setAddress] = React.useState("");
  const [capacity, setCapacity] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const regFn = useServerFn(registerAsHost);

  const mut = useMutation({
    mutationFn: () =>
      regFn({
        data: {
          eventId,
          hostName: name.trim(),
          hostAddress: address.trim(),
          hostCapacity: Number(capacity),
          agreed: true,
        },
      }),
    onSuccess: () => {
      toast.success("Jazak Allahu khairan — you are now registered as host.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["event-detail", eventSlug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (host.host_user_id) {
    return (
      <Card className="p-5 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Hosted by
            </p>
            <p className="font-semibold text-base">{host.host_name}</p>
            {host.host_address && (
              <p className="text-sm text-muted-foreground mt-1">{host.host_address}</p>
            )}
            {host.host_capacity ? (
              <p className="text-xs text-muted-foreground mt-1">
                Accommodation capacity: {host.host_capacity}
              </p>
            ) : null}
          </div>
        </div>
      </Card>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in to register as host");
    if (name.trim().length < 2) return toast.error("Full name required");
    if (address.trim().length < 2) return toast.error("Address required");
    const cap = Number(capacity);
    if (!cap || cap < 1) return toast.error("Capacity must be at least 1");
    if (!agreed) return toast.error("Please agree to the host responsibility statement");
    mut.mutate();
  };

  return (
    <>
      <Card className="p-5 border-dashed">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <Home className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">This event needs a host</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Volunteer to host this gathering and provide the venue & accommodation.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              if (!user) {
                toast.error("Please sign in to register as host");
                return;
              }
              setOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Register as Host
          </Button>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register as Host</DialogTitle>
            <DialogDescription>
              Once submitted, your information will appear on the event page and no one
              else can register as host.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="host-name">Full Name *</Label>
              <Input
                id="host-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div>
              <Label htmlFor="host-address">Location (Address) *</Label>
              <Textarea
                id="host-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={500}
                rows={3}
                required
                placeholder="Street, area, city"
              />
            </div>
            <div>
              <Label htmlFor="host-capacity">Capacity *</Label>
              <Input
                id="host-capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                placeholder="How many guests can you host?"
              />
            </div>
            <label className="flex gap-3 items-start cursor-pointer rounded-md border p-3 bg-muted/40">
              <Checkbox
                checked={agreed}
                onCheckedChange={(c) => setAgreed(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed space-y-2 block">
                <span className="block">{AGREEMENT_EN}</span>
                <span className="block" lang="bn">
                  {AGREEMENT_BN}
                </span>
              </span>
            </label>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mut.isPending || !agreed}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Confirm Registration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
