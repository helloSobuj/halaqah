import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, ArrowLeft, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listLibraryCategories, adminUpsertLibraryCategory, adminDeleteLibraryCategory,
} from "@/lib/library.functions";

export const Route = createFileRoute("/_authenticated/admin/library/categories")({
  head: () => ({ meta: [{ title: "Admin · Library Categories — Halaqah" }] }),
  component: AdminLibraryCategoriesPage,
});

type Cat = {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function AdminLibraryCategoriesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLibraryCategories);
  const upsertFn = useServerFn(adminUpsertLibraryCategory);
  const delFn = useServerFn(adminDeleteLibraryCategory);

  const cats = useQuery({ queryKey: ["library-cats"], queryFn: () => listFn() });
  const [editing, setEditing] = React.useState<Cat | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["library-cats"] }); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/admin/library" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to books
          </Link>
          <h2 className="text-xl font-bold">Library categories</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Group books into browsable categories (Quran, Hadith, Fiqh, etc.).
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New category
        </Button>
      </div>

      {cats.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !cats.data?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Tag className="h-8 w-8 mx-auto mb-2 opacity-60" />
          No categories yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {cats.data.map((c: Cat) => (
            <Card key={c.id} className="p-3 flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: `${c.color ?? "#6366f1"}20`, color: c.color ?? "#6366f1" }}
              >
                {c.icon ?? c.name_en.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{c.name_en} <span className="text-muted-foreground">· {c.name_bn}</span></p>
                <p className="text-xs text-muted-foreground">/{c.slug} · order {c.sort_order}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <CategoryDialog
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["library-cats"] });
            setCreating(false); setEditing(null);
          }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              Books in this category will become uncategorized. This cannot be undone.
            </AlertDialogDescription>
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

function CategoryDialog({
  initial, onClose, onSaved,
}: { initial: Cat | null; onClose: () => void; onSaved: () => void }) {
  const upsertFn = useServerFn(adminUpsertLibraryCategory);
  const [form, setForm] = React.useState({
    slug: initial?.slug ?? "",
    name_en: initial?.name_en ?? "",
    name_bn: initial?.name_bn ?? "",
    color: initial?.color ?? "#6366f1",
    icon: initial?.icon ?? "",
    sort_order: initial?.sort_order ?? 0,
  });
  const [autoSlug, setAutoSlug] = React.useState(!initial);

  const mut = useMutation({
    mutationFn: () => upsertFn({
      data: {
        id: initial?.id,
        slug: form.slug || slugify(form.name_en),
        name_en: form.name_en,
        name_bn: form.name_bn,
        color: form.color || undefined,
        icon: form.icon || undefined,
        sort_order: Number(form.sort_order) || 0,
      },
    }),
    onSuccess: () => { toast.success(initial ? "Updated" : "Created"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name (English) *</Label>
              <Input
                value={form.name_en}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, name_en: v, slug: autoSlug ? slugify(v) : f.slug }));
                }}
                maxLength={120}
              />
            </div>
            <div>
              <Label>Name (Bangla) *</Label>
              <Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} maxLength={120} />
            </div>
          </div>
          <div>
            <Label>Slug *</Label>
            <Input
              value={form.slug}
              onChange={(e) => { setAutoSlug(false); setForm({ ...form, slug: slugify(e.target.value) }); }}
              maxLength={60}
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Color</Label>
              <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 p-1" />
            </div>
            <div>
              <Label>Icon (emoji/text)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.name_en || !form.name_bn}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
