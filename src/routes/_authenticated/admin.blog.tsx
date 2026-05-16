import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, FileText, Bookmark, Loader2, Star, Upload, X, Music } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  listBlogCategories, listBlogTags,
  adminListPosts, adminUpsertPost, adminDeletePost, adminGetPost,
  adminUpsertBlogCategory, adminDeleteBlogCategory,
  adminUpsertBlogTag, adminDeleteBlogTag,
} from "@/lib/blog.functions";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  head: () => ({ meta: [{ title: "Admin · Blog — Halaqah" }] }),
  component: AdminBlogPage,
});

type Cat = { id: string; slug: string; name_en: string; name_bn: string; color: string | null; sort_order: number };
type TagT = { id: string; slug: string; label_en: string; label_bn: string; usage_count: number };
type Post = {
  id: string; slug: string; title_en: string; title_bn: string;
  excerpt_en: string | null; content_md_en: string; content_md_bn: string;
  cover_image_url: string | null; audio_url: string | null;
  category_id: string | null; is_published: boolean; is_featured: boolean;
  view_count: number; like_count: number; reading_minutes: number;
  category?: { name_en: string } | null;
};

function AdminBlogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Blog</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage posts, categories, and tags.</p>
      </div>
      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts"><FileText className="h-4 w-4 mr-1.5" />Posts</TabsTrigger>
          <TabsTrigger value="categories"><Bookmark className="h-4 w-4 mr-1.5" />Categories</TabsTrigger>
          <TabsTrigger value="tags"><Tag className="h-4 w-4 mr-1.5" />Tags</TabsTrigger>
        </TabsList>
        <TabsContent value="posts"><PostsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="tags"><TagsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// =========================== POSTS ===========================

function PostsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPosts);
  const delFn = useServerFn(adminDeletePost);

  const [search, setSearch] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const posts = useQuery({ queryKey: ["admin-blog-posts", search], queryFn: () => listFn({ data: { q: search || undefined } }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center justify-between flex-wrap">
        <Input placeholder="Search title…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1.5" />New post</Button>
      </div>

      {posts.isLoading ? <Skeleton className="h-40 w-full" /> :
       !posts.data?.length ? (
        <Card className="p-8 text-center text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-60" /> No posts yet.</Card>
       ) : (
        <div className="space-y-2">
          {(posts.data as Post[]).map((p) => (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              <div className="h-14 w-24 rounded bg-muted overflow-hidden flex-shrink-0">
                {p.cover_image_url ? <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{p.title_en}</p>
                  {!p.is_published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                  {p.is_featured && <Badge variant="outline" className="text-[10px]"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                  {p.audio_url && <Badge variant="outline" className="text-[10px]"><Music className="h-3 w-3 mr-1" />Audio</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {p.category?.name_en ?? "—"} · {p.reading_minutes} min · {p.view_count} views · {p.like_count} likes
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditingId(p.id)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
       )}

      {(creating || editingId) && (
        <PostDialog
          postId={editingId}
          onClose={() => { setCreating(false); setEditingId(null); }}
          onSaved={() => { invalidate(); setCreating(false); setEditingId(null); }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
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

function PostDialog({ postId, onClose, onSaved }: { postId: string | null; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const upsertFn = useServerFn(adminUpsertPost);
  const getFn = useServerFn(adminGetPost);
  const catsFn = useServerFn(listBlogCategories);
  const tagsFn = useServerFn(listBlogTags);
  const upsertTagFn = useServerFn(adminUpsertBlogTag);

  const cats = useQuery({ queryKey: ["blog-cats"], queryFn: () => catsFn() });
  const tags = useQuery({ queryKey: ["blog-tags-all"], queryFn: () => tagsFn({ data: { limit: 100 } }) });
  const existing = useQuery({
    queryKey: ["admin-blog-post", postId],
    queryFn: () => postId ? getFn({ data: { id: postId } }) : Promise.resolve(null),
    enabled: !!postId,
  });

  const [form, setForm] = React.useState({
    title_en: "", title_bn: "",
    excerpt_en: "", excerpt_bn: "",
    content_md_en: "", content_md_bn: "",
    cover_image_url: "", audio_url: "",
    category_id: "", language: "en",
    is_published: false, is_featured: false,
    tagIds: [] as string[],
  });
  const [audioUploading, setAudioUploading] = React.useState(false);
  const [coverUploading, setCoverUploading] = React.useState(false);
  const [newTag, setNewTag] = React.useState("");

  React.useEffect(() => {
    if (existing.data?.post) {
      const p = existing.data.post as any;
      setForm({
        title_en: p.title_en, title_bn: p.title_bn ?? "",
        excerpt_en: p.excerpt_en ?? "", excerpt_bn: p.excerpt_bn ?? "",
        content_md_en: p.content_md_en ?? "", content_md_bn: p.content_md_bn ?? "",
        cover_image_url: p.cover_image_url ?? "", audio_url: p.audio_url ?? "",
        category_id: p.category_id ?? "", language: p.language ?? "en",
        is_published: p.is_published, is_featured: p.is_featured,
        tagIds: existing.data.tagIds ?? [],
      });
    }
  }, [existing.data]);

  const upload = async (file: File, bucket: string, setUrl: (s: string) => void, setBusy: (b: boolean) => void) => {
    if (!user) return toast.error("Sign in");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setUrl(data.publicUrl);
      toast.success("Uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const mut = useMutation({
    mutationFn: () => upsertFn({
      data: {
        id: postId ?? undefined,
        title_en: form.title_en,
        title_bn: form.title_bn,
        excerpt_en: form.excerpt_en || null,
        excerpt_bn: form.excerpt_bn || null,
        content_md_en: form.content_md_en,
        content_md_bn: form.content_md_bn,
        cover_image_url: form.cover_image_url || null,
        audio_url: form.audio_url || null,
        category_id: form.category_id || null,
        language: form.language,
        is_published: form.is_published,
        is_featured: form.is_featured,
        tagIds: form.tagIds,
      },
    }),
    onSuccess: () => { toast.success(postId ? "Updated" : "Created"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTagMut = useMutation({
    mutationFn: (label: string) => upsertTagFn({ data: { label_en: label } }),
    onSuccess: (row: any) => {
      setForm((f) => ({ ...f, tagIds: [...f.tagIds, row.id] }));
      setNewTag("");
      tags.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{postId ? "Edit post" : "New post"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Title (English) *</Label><Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} /></div>
            <div><Label>Title (Bangla)</Label><Input value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} /></div>
          </div>
          <div><Label>Excerpt (English)</Label><Textarea rows={2} value={form.excerpt_en} onChange={(e) => setForm({ ...form, excerpt_en: e.target.value })} /></div>

          <div>
            <Label>Cover image</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://…" />
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "blog-media", (u) => setForm({ ...form, cover_image_url: u }), setCoverUploading); }} />
                <span className="inline-flex"><Button asChild variant="outline" size="sm" disabled={coverUploading}><span>{coverUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</span></Button></span>
              </label>
            </div>
            {form.cover_image_url && <img src={form.cover_image_url} alt="" className="mt-2 h-32 rounded object-cover" />}
          </div>

          <div>
            <Label>Narration audio (optional)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} placeholder="https://… (mp3/m4a)" />
              <label className="cursor-pointer">
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "blog-audio", (u) => setForm({ ...form, audio_url: u }), setAudioUploading); }} />
                <span className="inline-flex"><Button asChild variant="outline" size="sm" disabled={audioUploading}><span>{audioUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</span></Button></span>
              </label>
              {form.audio_url && <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, audio_url: "" })}><X className="h-4 w-4" /></Button>}
            </div>
            {form.audio_url && <audio src={form.audio_url} controls className="w-full mt-2" />}
          </div>

          <div>
            <Label>Content (English)</Label>
            <MarkdownEditor value={form.content_md_en} onChange={(v) => setForm({ ...form, content_md_en: v })} rows={14} mediaBucket="blog-media" />
          </div>
          <div>
            <Label>Content (Bangla)</Label>
            <MarkdownEditor value={form.content_md_bn} onChange={(v) => setForm({ ...form, content_md_bn: v })} rows={8} mediaBucket="blog-media" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(cats.data as Cat[] | undefined)?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">Bangla</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(tags.data as TagT[] | undefined)?.map((t) => {
                const sel = form.tagIds.includes(t.id);
                return (
                  <Badge key={t.id} variant={sel ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setForm((f) => ({ ...f, tagIds: sel ? f.tagIds.filter((x) => x !== t.id) : [...f.tagIds, t.id] }))}>
                    #{t.label_en}
                  </Badge>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag…" className="max-w-xs" />
              <Button type="button" size="sm" variant="outline" disabled={!newTag.trim() || addTagMut.isPending} onClick={() => addTagMut.mutate(newTag.trim())}>Add tag</Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><Label>Published</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /><Label>Featured</Label></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.title_en.trim()}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================== CATEGORIES ===========================

function CategoriesTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBlogCategories);
  const upsertFn = useServerFn(adminUpsertBlogCategory);
  const delFn = useServerFn(adminDeleteBlogCategory);

  const cats = useQuery({ queryKey: ["blog-cats"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["blog-cats"] });

  const [editing, setEditing] = React.useState<Cat | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [delId, setDelId] = React.useState<string | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { invalidate(); setDelId(null); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1.5" />New category</Button></div>
      {cats.isLoading ? <Skeleton className="h-32" /> :
       !cats.data?.length ? <Card className="p-6 text-center text-muted-foreground">No categories yet.</Card> :
       <div className="space-y-2">
         {(cats.data as Cat[]).map((c) => (
           <Card key={c.id} className="p-3 flex items-center gap-3">
             <div className="flex-1"><p className="font-medium text-sm">{c.name_en}</p><p className="text-xs text-muted-foreground">/{c.slug} · {c.name_bn}</p></div>
             <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
             <Button size="icon" variant="ghost" onClick={() => setDelId(c.id)}><Trash2 className="h-4 w-4" /></Button>
           </Card>
         ))}
       </div>}

      {(creating || editing) && (
        <CatDialog initial={editing} onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { invalidate(); setCreating(false); setEditing(null); }} upsertFn={upsertFn} />
      )}
      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete category?</AlertDialogTitle><AlertDialogDescription>Posts in it will be uncategorized.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => delId && delMut.mutate(delId)}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CatDialog({ initial, onClose, onSaved, upsertFn }: { initial: Cat | null; onClose: () => void; onSaved: () => void; upsertFn: any }) {
  const [form, setForm] = React.useState({
    name_en: initial?.name_en ?? "", name_bn: initial?.name_bn ?? "",
    slug: initial?.slug ?? "", sort_order: initial?.sort_order ?? 0,
  });
  const mut = useMutation({
    mutationFn: () => upsertFn({ data: { id: initial?.id, ...form, slug: form.slug || form.name_en } }),
    onSuccess: () => { toast.success("Saved"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name (EN) *</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
          <div><Label>Name (BN) *</Label><Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></div>
          <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mut.isPending || !form.name_en || !form.name_bn} onClick={() => mut.mutate()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================== TAGS ===========================

function TagsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBlogTags);
  const upsertFn = useServerFn(adminUpsertBlogTag);
  const delFn = useServerFn(adminDeleteBlogTag);

  const tags = useQuery({ queryKey: ["blog-tags-all"], queryFn: () => listFn({ data: { limit: 200 } }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["blog-tags-all"] });

  const [label, setLabel] = React.useState("");
  const [delId, setDelId] = React.useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: () => upsertFn({ data: { label_en: label } }),
    onSuccess: () => { invalidate(); setLabel(""); toast.success("Added"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { invalidate(); setDelId(null); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="New tag label" className="max-w-xs" />
        <Button disabled={!label.trim() || addMut.isPending} onClick={() => addMut.mutate()}><Plus className="h-4 w-4 mr-1.5" />Add</Button>
      </div>
      {tags.isLoading ? <Skeleton className="h-32" /> : !tags.data?.length ? <p className="text-muted-foreground">No tags yet.</p> :
        <div className="flex flex-wrap gap-2">
          {(tags.data as TagT[]).map((t) => (
            <Badge key={t.id} variant="outline" className="text-sm py-1 px-2">
              #{t.label_en} <span className="text-muted-foreground ml-1">({t.usage_count})</span>
              <button className="ml-1.5 text-destructive" onClick={() => setDelId(t.id)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>}
      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete tag?</AlertDialogTitle><AlertDialogDescription>Removes it from all posts.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => delId && delMut.mutate(delId)}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
