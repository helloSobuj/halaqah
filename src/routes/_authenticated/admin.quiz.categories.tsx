import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { listCategories, upsertCategory, deleteCategory } from "@/lib/quiz.functions";
import { useUserRole } from "@/hooks/use-user-role";

export const Route = createFileRoute("/_authenticated/admin/quiz/categories")({
  component: CategoriesAdmin,
});

type CForm = {
  id?: string;
  slug: string;
  name_en: string;
  name_bn: string;
  icon: string;
  color: string;
  sort_order: number;
};

const EMPTY: CForm = { slug: "", name_en: "", name_bn: "", icon: "", color: "", sort_order: 0 };

function CategoriesAdmin() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();

  const listFn = useServerFn(listCategories);
  const upFn = useServerFn(upsertCategory);
  const delFn = useServerFn(deleteCategory);

  const list = useQuery({ queryKey: ["quiz-categories"], queryFn: () => listFn() });
  const [editing, setEditing] = React.useState<CForm | null>(null);

  const upM = useMutation({
    mutationFn: (data: CForm) =>
      upFn({
        data: {
          ...data,
          icon: data.icon || null,
          color: data.color || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quiz-categories"] });
      toast.success("Saved");
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quiz-categories"] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Link to="/admin/quiz" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("admin.quiz.title")}
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-foreground">{t("admin.categories.title")}</h2>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4 mr-1" /> {t("admin.categories.new")}
        </Button>
      </div>

      <Card className="divide-y divide-border">
        {list.isLoading && <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>}
        {list.data?.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.categories.empty")}</div>
        )}
        {list.data?.map((c) => (
          <div key={c.id} className="p-4 flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: c.color || "hsl(var(--primary))" }}
            >
              {(c.name_en || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground truncate">
                {isBn ? c.name_bn : c.name_en}
              </div>
              <div className="text-xs text-muted-foreground">/{c.slug} • sort {c.sort_order}</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setEditing({
                  id: c.id,
                  slug: c.slug,
                  name_en: c.name_en,
                  name_bn: c.name_bn,
                  icon: c.icon ?? "",
                  color: c.color ?? "",
                  sort_order: c.sort_order,
                })
              }
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Delete this category?")) delM.mutate(c.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              </Button>
            )}
          </div>
        ))}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("admin.categories.edit") : t("admin.categories.new")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Slug</Label>
                <Input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase() })}
                  placeholder="quran"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name (English)</Label>
                  <Input value={editing.name_en} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} />
                </div>
                <div>
                  <Label>Name (বাংলা)</Label>
                  <Input value={editing.name_bn} onChange={(e) => setEditing({ ...editing, name_bn: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Icon</Label>
                  <Input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="book-open" />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} placeholder="#10b981" />
                </div>
                <div>
                  <Label>Sort</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => editing && upM.mutate(editing)} disabled={upM.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
