import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Star, BookOpen, Loader2, Tag } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookForm, emptyBook, type BookFormValue } from "@/components/library/book-form";
import {
  adminListBooks, adminUpsertBook, adminDeleteBook, adminReviewBook,
  listLibraryCategories,
} from "@/lib/library.functions";

export const Route = createFileRoute("/_authenticated/admin/library")({
  head: () => ({ meta: [{ title: "Admin · Library — Halaqah" }] }),
  component: AdminLibraryPage,
});

type BookRow = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  description: string | null;
  language: BookFormValue["language"];
  category_id: string | null;
  cover_image_url: string | null;
  published_year: number | null;
  pages: number | null;
  source_type: "pdf" | "external";
  pdf_path: string | null;
  pdf_size_bytes: number | null;
  external_url: string | null;
  status: "pending" | "approved" | "rejected";
  is_featured: boolean;
  download_count: number;
  avg_rating: number;
  rating_count: number;
  rejection_reason: string | null;
  created_at: string;
  category?: { name_en: string; name_bn: string } | null;
};

function statusVariant(s: string): "default" | "secondary" | "destructive" {
  if (s === "approved") return "default";
  if (s === "rejected") return "destructive";
  return "secondary";
}

function AdminLibraryPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListBooks);
  const catsFn = useServerFn(listLibraryCategories);
  const delFn = useServerFn(adminDeleteBook);
  const reviewFn = useServerFn(adminReviewBook);
  const upsertFn = useServerFn(adminUpsertBook);

  const [status, setStatus] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<BookRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");

  const books = useQuery({
    queryKey: ["admin-library", status, search],
    queryFn: () => listFn({ data: { status: status === "all" ? undefined : (status as any), q: search || undefined } }),
  });
  const cats = useQuery({ queryKey: ["library-cats"], queryFn: () => catsFn() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-library"] });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Book deleted"); invalidate(); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => reviewFn({ data: { id, decision: "approve" } }),
    onSuccess: () => { toast.success("Approved"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMut = useMutation({
    mutationFn: () => reviewFn({ data: { id: rejectId!, decision: "reject", reason: rejectReason || undefined } }),
    onSuccess: () => { toast.success("Rejected"); invalidate(); setRejectId(null); setRejectReason(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const featureMut = useMutation({
    mutationFn: (b: BookRow) =>
      upsertFn({
        data: {
          id: b.id,
          title: b.title,
          author: b.author,
          description: b.description,
          language: b.language,
          category_id: b.category_id,
          cover_image_url: b.cover_image_url,
          published_year: b.published_year,
          pages: b.pages,
          source_type: b.source_type,
          pdf_path: b.pdf_path,
          pdf_size_bytes: b.pdf_size_bytes,
          external_url: b.external_url,
          is_featured: !b.is_featured,
        },
      }),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage book submissions, approve community contributions, and publish books.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/library/categories">
            <Button variant="outline" size="sm"><Tag className="h-4 w-4 mr-1.5" />Categories</Button>
          </Link>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New book
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search title or author…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {books.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !books.data?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-60" />
          No books match your filters.
        </Card>
      ) : (
        <div className="space-y-2">
          {(books.data as BookRow[]).map((b) => (
            <Card key={b.id} className="p-4 flex items-start gap-3">
              <div className="h-16 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                {b.cover_image_url ? (
                  <img src={b.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium truncate">{b.title}</h3>
                  <Badge variant={statusVariant(b.status)} className="text-[10px] capitalize">
                    {b.status}
                  </Badge>
                  {b.is_featured && (
                    <Badge variant="outline" className="text-[10px]">
                      <Star className="h-3 w-3 mr-1" />Featured
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] uppercase">{b.language}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{b.source_type === "pdf" ? "PDF" : "Link"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {b.author ?? "—"}{b.category ? ` · ${b.category.name_en}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {b.download_count} downloads · {b.avg_rating > 0 ? `★ ${b.avg_rating.toFixed(1)} (${b.rating_count})` : "no ratings"} · {new Date(b.created_at).toLocaleDateString()}
                </p>
                {b.status === "rejected" && b.rejection_reason && (
                  <p className="text-xs text-destructive mt-1">Reason: {b.rejection_reason}</p>
                )}
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {b.status === "pending" && (
                  <>
                    <Button size="sm" variant="default" onClick={() => approveMut.mutate(b.id)} disabled={approveMut.isPending}>
                      <Check className="h-4 w-4 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectId(b.id)}>
                      <X className="h-4 w-4 mr-1" />Reject
                    </Button>
                  </>
                )}
                <Button size="icon" variant="ghost" title={b.is_featured ? "Unfeature" : "Feature"} onClick={() => featureMut.mutate(b)} disabled={featureMut.isPending}>
                  <Star className={b.is_featured ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4"} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <BookDialog
          initial={editing}
          categories={cats.data ?? []}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { invalidate(); setCreating(false); setEditing(null); }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the book and all bookmarks, ratings, and comments. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && delMut.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && (setRejectId(null), setRejectReason(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason (optional, shown to the submitter)</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} maxLength={500} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
              {rejectMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookDialog({
  initial, categories, onClose, onSaved,
}: {
  initial: BookRow | null;
  categories: Array<{ id: string; name_en: string; name_bn: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsertFn = useServerFn(adminUpsertBook);
  const [form, setForm] = React.useState<BookFormValue>(
    initial
      ? {
          title: initial.title,
          author: initial.author ?? "",
          description: initial.description ?? "",
          language: initial.language,
          category_id: initial.category_id,
          cover_image_url: initial.cover_image_url,
          published_year: initial.published_year,
          pages: initial.pages,
          source_type: initial.source_type,
          pdf_path: initial.pdf_path,
          pdf_size_bytes: initial.pdf_size_bytes,
          external_url: initial.external_url,
        }
      : emptyBook,
  );
  const [status, setStatus] = React.useState<"pending" | "approved" | "rejected">(initial?.status ?? "approved");

  const mut = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          id: initial?.id,
          ...form,
          author: form.author || null,
          description: form.description || null,
          status,
        },
      }),
    onSuccess: () => { toast.success(initial ? "Updated" : "Created"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const disabled =
    mut.isPending ||
    !form.title.trim() ||
    (form.source_type === "pdf" ? !form.pdf_path : !form.external_url);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit book" : "New book"}</DialogTitle>
        </DialogHeader>
        <BookForm value={form} onChange={setForm} categories={categories} />
        <div className="pt-3 border-t">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[200px] mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Approved (public)</SelectItem>
              <SelectItem value="pending">Pending review</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={disabled}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
