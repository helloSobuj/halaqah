import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar, Star, Eye, EyeOff, ImagePlus, Loader2, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MarkdownEditor } from "@/components/qa/markdown-editor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  adminListAllEvents, adminUpsertEvent, adminDeleteEvent, listEventCategories,
  adminListEventRsvps,
} from "@/lib/events.functions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({ meta: [{ title: "Admin · Events — Halaqah" }] }),
  component: AdminEventsPage,
});

type EventRow = {
  id: string;
  slug: string;
  title_en: string;
  title_bn: string;
  description_md_en: string;
  description_md_bn: string;
  cover_image_url: string | null;
  category_id: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  mode: string;
  venue: string | null;
  address: string | null;
  online_url: string | null;
  capacity: number | null;
  is_published: boolean;
  is_featured: boolean;
};

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminEventsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAllEvents);
  const catsFn = useServerFn(listEventCategories);
  const delFn = useServerFn(adminDeleteEvent);

  const events = useQuery({ queryKey: ["admin-events"], queryFn: () => listFn() });
  const cats = useQuery({ queryKey: ["event-cats"], queryFn: () => catsFn() });

  const [editing, setEditing] = React.useState<EventRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [rsvpEvent, setRsvpEvent] = React.useState<{ id: string; title: string; capacity: number | null; counts: { going: number; interested: number } } | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Events</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and publish community events.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New event
        </Button>
      </div>

      {events.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !events.data?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-60" />
          No events yet. Create your first one.
        </Card>
      ) : (
        <div className="space-y-2">
          {events.data.map((e) => (
            <Card key={e.id} className="p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {e.cover_image_url ? (
                  <img src={e.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium truncate">{e.title_en}</h3>
                  {e.is_published ? (
                    <Badge variant="default" className="text-[10px]">
                      <Eye className="h-3 w-3 mr-1" /> Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      <EyeOff className="h-3 w-3 mr-1" /> Draft
                    </Badge>
                  )}
                  {e.is_featured && (
                    <Badge variant="outline" className="text-[10px]">
                      <Star className="h-3 w-3 mr-1" /> Featured
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(e.starts_at).toLocaleString()} · {e.mode}
                  {e.venue ? ` · ${e.venue}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {(e as { counts?: { going: number; interested: number } }).counts?.going ?? 0} going ·{" "}
                    {(e as { counts?: { going: number; interested: number } }).counts?.interested ?? 0} interested
                  </span>
                  {e.capacity ? (
                    <span>
                      · {Math.max(0, e.capacity - ((e as { counts?: { going: number } }).counts?.going ?? 0))} of {e.capacity} seats left
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  title="View registrations"
                  onClick={() =>
                    setRsvpEvent({
                      id: e.id,
                      title: e.title_en,
                      capacity: e.capacity,
                      counts: (e as { counts?: { going: number; interested: number } }).counts ?? { going: 0, interested: 0 },
                    })
                  }
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(e as EventRow)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(e.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <EventDialog
          initial={editing}
          categories={cats.data ?? []}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-events"] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the event and all RSVPs. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && delMut.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {rsvpEvent && (
        <RsvpListDialog
          event={rsvpEvent}
          onClose={() => setRsvpEvent(null)}
        />
      )}
    </div>
  );
}

function RsvpListDialog({
  event,
  onClose,
}: {
  event: { id: string; title: string; capacity: number | null; counts: { going: number; interested: number } };
  onClose: () => void;
}) {
  const fn = useServerFn(adminListEventRsvps);
  const q = useQuery({
    queryKey: ["admin-event-rsvps", event.id],
    queryFn: () => fn({ data: { eventId: event.id } }),
  });
  const seatsLeft = event.capacity
    ? Math.max(0, event.capacity - event.counts.going)
    : null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrations · {event.title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-3">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{event.counts.going}</div>
            <div className="text-xs text-muted-foreground">Going</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{event.counts.interested}</div>
            <div className="text-xs text-muted-foreground">Interested</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">
              {event.capacity ? seatsLeft : "∞"}
            </div>
            <div className="text-xs text-muted-foreground">
              {event.capacity ? `Seats left / ${event.capacity}` : "No limit"}
            </div>
          </Card>
        </div>
        {q.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !q.data?.length ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No registrations yet.
          </Card>
        ) : (
          <div className="space-y-1.5">
            {q.data.map((r) => (
              <Card key={r.user_id + r.status} className="p-3 flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(r.profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.profile?.display_name ?? "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant={r.status === "going" ? "default" : "secondary"} className="text-[10px] capitalize">
                  {r.status}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventDialog({
  initial,
  categories,
  onClose,
  onSaved,
}: {
  initial: EventRow | null;
  categories: Array<{ id: string; name_en: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const upsertFn = useServerFn(adminUpsertEvent);

  const [form, setForm] = React.useState({
    title_en: initial?.title_en ?? "",
    title_bn: initial?.title_bn ?? "",
    slug: initial?.slug ?? "",
    category_id: initial?.category_id ?? "",
    description_md_en: initial?.description_md_en ?? "",
    description_md_bn: initial?.description_md_bn ?? "",
    cover_image_url: initial?.cover_image_url ?? "",
    starts_at: toLocalInput(initial?.starts_at),
    ends_at: toLocalInput(initial?.ends_at),
    timezone: initial?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
    mode: (initial?.mode as "online" | "offline" | "hybrid") ?? "offline",
    venue: initial?.venue ?? "",
    address: initial?.address ?? "",
    online_url: initial?.online_url ?? "",
    capacity: initial?.capacity?.toString() ?? "",
    is_published: initial?.is_published ?? false,
    is_featured: initial?.is_featured ?? false,
  });

  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    if (!user) return toast.error("Sign in required");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("event-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("event-images").getPublicUrl(path);
      setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const mut = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          id: initial?.id,
          slug: form.slug || undefined,
          title_en: form.title_en,
          title_bn: form.title_bn,
          category_id: form.category_id || null,
          description_md_en: form.description_md_en,
          description_md_bn: form.description_md_bn,
          cover_image_url: form.cover_image_url || null,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          timezone: form.timezone,
          mode: form.mode,
          venue: form.venue || null,
          address: form.address || null,
          online_url: form.online_url || null,
          capacity: form.capacity ? Number(form.capacity) : null,
          is_published: form.is_published,
          is_featured: form.is_featured,
        },
      }),
    onSuccess: () => {
      toast.success(initial ? "Event updated" : "Event created");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title_en.trim() || !form.title_bn.trim()) {
      return toast.error("Title (EN & BN) required");
    }
    if (!form.starts_at) return toast.error("Start time required");
    mut.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Title (English) *</Label>
              <Input
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                maxLength={200}
                required
              />
            </div>
            <div>
              <Label>Title (Bangla) *</Label>
              <Input
                value={form.title_bn}
                onChange={(e) => setForm({ ...form, title_bn: e.target.value })}
                maxLength={200}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Slug (optional)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generated from title"
                maxLength={80}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category_id || "none"}
                onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Uncategorized" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Cover image</Label>
            <div className="flex items-start gap-3 mt-1">
              <div className="h-24 w-40 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-muted-foreground">
                {form.cover_image_url ? (
                  <img src={form.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Uploading…</>
                  ) : (
                    <><ImagePlus className="h-4 w-4 mr-1.5" />Upload</>
                  )}
                </Button>
                <Input
                  value={form.cover_image_url}
                  onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                  placeholder="…or paste image URL"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Starts at *</Label>
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Ends at</Label>
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="UTC"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Mode</Label>
              <Select
                value={form.mode}
                onValueChange={(v) => setForm({ ...form, mode: v as "online" | "offline" | "hybrid" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">In-person</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacity (optional)</Label>
              <Input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
          </div>

          {form.mode !== "online" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Venue</Label>
                <Input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  maxLength={200}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          {form.mode !== "offline" && (
            <div>
              <Label>Online URL</Label>
              <Input
                type="url"
                value={form.online_url}
                onChange={(e) => setForm({ ...form, online_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
          )}

          <div>
            <Label>Description (English)</Label>
            <MarkdownEditor
              value={form.description_md_en}
              onChange={(v) => setForm({ ...form, description_md_en: v })}
              placeholder="Markdown supported. Drop images to upload."
              rows={6}
            />
          </div>

          <div>
            <Label>Description (Bangla)</Label>
            <MarkdownEditor
              value={form.description_md_bn}
              onChange={(v) => setForm({ ...form, description_md_bn: v })}
              placeholder="মার্কডাউন সমর্থিত।"
              rows={6}
            />
          </div>

          <div className="flex gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_published}
                onCheckedChange={(c) => setForm({ ...form, is_published: c })}
              />
              <Label className="cursor-pointer">Published</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_featured}
                onCheckedChange={(c) => setForm({ ...form, is_featured: c })}
              />
              <Label className="cursor-pointer">Featured</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {initial ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
