import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Pin, Bell, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import {
  adminListNotices, adminUpsertNotice, adminDeleteNotice,
} from "@/lib/notices.functions";

export const Route = createFileRoute("/_authenticated/admin/notices")({
  head: () => ({ meta: [{ title: "Admin · Notices — Halaqah" }] }),
  component: AdminNoticesPage,
});

type Notice = {
  id: string;
  title_en: string;
  title_bn: string;
  body_md_en: string;
  body_md_bn: string;
  cover_image_url: string | null;
  priority: "normal" | "important" | "urgent";
  is_pinned: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

function AdminNoticesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListNotices);
  const delFn = useServerFn(adminDeleteNotice);

  const [editing, setEditing] = React.useState<Notice | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const notices = useQuery({ queryKey: ["admin-notices"], queryFn: () => listFn() });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-notices"] });
    qc.invalidateQueries({ queryKey: ["notices-public"] });
    qc.invalidateQueries({ queryKey: ["unread-notices"] });
  };

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Notice deleted"); invalidate(); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Notices</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Post announcements. Members will see them on the home page and notices page.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1.5" />New notice</Button>
      </div>

      {notices.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !notices.data?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-60" />
          No notices yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {(notices.data as Notice[]).map((n) => (
            <Card key={n.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {n.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                  <p className="font-medium text-sm truncate">{n.title_en || "(untitled)"}</p>
                  {!n.is_published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                  {n.priority === "important" && <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300">Important</Badge>}
                  {n.priority === "urgent" && <Badge className="text-[10px] bg-rose-500/15 text-rose-700 dark:text-rose-300">Urgent</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {n.published_at ? new Date(n.published_at).toLocaleString() : "Not published"}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(n)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setDeleteId(n.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <NoticeFormDialog
          notice={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { invalidate(); setCreating(false); setEditing(null); }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this notice?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && delMut.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NoticeFormDialog({
  notice, onClose, onSaved,
}: { notice: Notice | null; onClose: () => void; onSaved: () => void }) {
  const upsertFn = useServerFn(adminUpsertNotice);
  const [title_en, setTitleEn] = React.useState(notice?.title_en ?? "");
  const [title_bn, setTitleBn] = React.useState(notice?.title_bn ?? "");
  const [body_md_en, setBodyEn] = React.useState(notice?.body_md_en ?? "");
  const [body_md_bn, setBodyBn] = React.useState(notice?.body_md_bn ?? "");
  const [priority, setPriority] = React.useState<Notice["priority"]>(notice?.priority ?? "normal");
  const [is_pinned, setPinned] = React.useState(notice?.is_pinned ?? false);
  const [is_published, setPublished] = React.useState(notice?.is_published ?? true);

  const mut = useMutation({
    mutationFn: () => upsertFn({
      data: { id: notice?.id, title_en, title_bn, body_md_en, body_md_bn, priority, is_pinned, is_published },
    }),
    onSuccess: () => { toast.success(notice ? "Notice updated" : "Notice published"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{notice ? "Edit notice" : "New notice"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title (English) *</Label>
            <Input value={title_en} onChange={(e) => setTitleEn(e.target.value)} maxLength={200} placeholder="e.g. Eid prayer schedule" />
          </div>
          <div className="space-y-1.5">
            <Label>Title (Bangla)</Label>
            <Input value={title_bn} onChange={(e) => setTitleBn(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label>Body (English)</Label>
            <MarkdownEditor value={body_md_en} onChange={setBodyEn} rows={8} placeholder="Write the notice…" />
          </div>
          <div className="space-y-1.5">
            <Label>Body (Bangla)</Label>
            <MarkdownEditor value={body_md_bn} onChange={setBodyBn} rows={8} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Notice["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={is_pinned} onCheckedChange={setPinned} id="pinned" />
              <Label htmlFor="pinned" className="cursor-pointer">Pin to top</Label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={is_published} onCheckedChange={setPublished} id="published" />
              <Label htmlFor="published" className="cursor-pointer">Publish</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !title_en.trim()}>
            {mut.isPending ? "Saving…" : notice ? "Save changes" : "Publish notice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
