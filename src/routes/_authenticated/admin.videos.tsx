import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Video as VideoIcon, ListVideo, Tag, Loader2, Star } from "lucide-react";

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
import {
  listVideoCategories, adminListPlaylists, adminListVideos,
  adminUpsertVideoCategory, adminDeleteVideoCategory,
  adminUpsertPlaylist, adminDeletePlaylist,
  adminUpsertVideo, adminDeleteVideo,
} from "@/lib/videos.functions";
import { extractYouTubeId, youtubeThumbnail } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/admin/videos")({
  head: () => ({ meta: [{ title: "Admin · Videos — Halaqah" }] }),
  component: AdminVideosPage,
});

type Cat = { id: string; slug: string; name_en: string; name_bn: string; color: string | null; icon: string | null; sort_order: number };
type Playlist = { id: string; slug: string; title_en: string; title_bn: string; description_en: string | null; description_bn: string | null; category_id: string | null; cover_image_url: string | null; youtube_playlist_id: string | null; is_published: boolean; is_featured: boolean; sort_order: number; category?: { name_en: string } | null };
type Video = { id: string; slug: string; title_en: string; title_bn: string; description_en: string | null; description_bn: string | null; youtube_url: string; youtube_video_id: string; thumbnail_url: string | null; speaker: string | null; language: string; category_id: string | null; playlist_id: string | null; is_published: boolean; is_featured: boolean; sort_order: number; duration_seconds: number | null; view_count: number; category?: { name_en: string } | null; playlist?: { title_en: string } | null };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function AdminVideosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Videos</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage YouTube videos, playlists, and categories.</p>
      </div>
      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="videos"><VideoIcon className="h-4 w-4 mr-1.5" />Videos</TabsTrigger>
          <TabsTrigger value="playlists"><ListVideo className="h-4 w-4 mr-1.5" />Playlists</TabsTrigger>
          <TabsTrigger value="categories"><Tag className="h-4 w-4 mr-1.5" />Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="videos"><VideosTab /></TabsContent>
        <TabsContent value="playlists"><PlaylistsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================ VIDEOS ============================

function VideosTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListVideos);
  const delFn = useServerFn(adminDeleteVideo);
  const catsFn = useServerFn(listVideoCategories);
  const plsFn = useServerFn(adminListPlaylists);

  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<Video | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const videos = useQuery({ queryKey: ["admin-videos", search], queryFn: () => listFn({ data: { q: search || undefined } }) });
  const cats = useQuery({ queryKey: ["video-cats"], queryFn: () => catsFn() });
  const pls = useQuery({ queryKey: ["admin-playlists-all"], queryFn: () => plsFn({ data: {} }) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-videos"] });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center justify-between flex-wrap">
        <Input placeholder="Search title…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1.5" />New video</Button>
      </div>

      {videos.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !videos.data?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <VideoIcon className="h-8 w-8 mx-auto mb-2 opacity-60" /> No videos yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {(videos.data as Video[]).map((v) => (
            <Card key={v.id} className="p-3 flex items-center gap-3">
              <img
                src={v.thumbnail_url || youtubeThumbnail(v.youtube_video_id, "mq")}
                alt=""
                className="h-14 w-24 rounded object-cover bg-muted flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{v.title_en}</p>
                  {!v.is_published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                  {v.is_featured && <Badge variant="outline" className="text-[10px]"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                  <Badge variant="secondary" className="text-[10px] uppercase">{v.language}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {v.speaker ?? "—"}
                  {v.category ? ` · ${v.category.name_en}` : ""}
                  {v.playlist ? ` · ${v.playlist.title_en}` : ""}
                  {" · "}{v.view_count} views
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(v)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setDeleteId(v.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <VideoDialog
          initial={editing}
          categories={cats.data ?? []}
          playlists={(pls.data ?? []) as Playlist[]}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { invalidate(); setCreating(false); setEditing(null); }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
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

function VideoDialog({
  initial, categories, playlists, onClose, onSaved,
}: { initial: Video | null; categories: Cat[]; playlists: Playlist[]; onClose: () => void; onSaved: () => void }) {
  const upsertFn = useServerFn(adminUpsertVideo);
  const [form, setForm] = React.useState({
    title_en: initial?.title_en ?? "",
    title_bn: initial?.title_bn ?? "",
    description_en: initial?.description_en ?? "",
    description_bn: initial?.description_bn ?? "",
    youtube_url: initial?.youtube_url ?? "",
    category_id: initial?.category_id ?? "",
    playlist_id: initial?.playlist_id ?? "",
    speaker: initial?.speaker ?? "",
    language: initial?.language ?? "en",
    duration_seconds: initial?.duration_seconds ?? 0,
    is_published: initial?.is_published ?? true,
    is_featured: initial?.is_featured ?? false,
    sort_order: initial?.sort_order ?? 0,
  });

  const ytId = extractYouTubeId(form.youtube_url);

  const mut = useMutation({
    mutationFn: () => upsertFn({
      data: {
        id: initial?.id,
        title_en: form.title_en,
        title_bn: form.title_bn,
        description_en: form.description_en || null,
        description_bn: form.description_bn || null,
        youtube_url: form.youtube_url,
        category_id: form.category_id || null,
        playlist_id: form.playlist_id || null,
        speaker: form.speaker || null,
        language: form.language as any,
        duration_seconds: Number(form.duration_seconds) || null,
        is_published: form.is_published,
        is_featured: form.is_featured,
        sort_order: Number(form.sort_order) || 0,
      },
    }),
    onSuccess: () => { toast.success(initial ? "Updated" : "Created"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit video" : "New video"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>YouTube URL *</Label>
            <Input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
            {form.youtube_url && (
              <p className={`text-xs mt-1 ${ytId ? "text-muted-foreground" : "text-destructive"}`}>
                {ytId ? `Video ID: ${ytId}` : "Could not parse YouTube ID"}
              </p>
            )}
            {ytId && (
              <img src={youtubeThumbnail(ytId, "mq")} alt="" className="mt-2 rounded h-24 object-cover" />
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Title (English) *</Label>
              <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
            </div>
            <div>
              <Label>Title (Bangla)</Label>
              <Input value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description (English)</Label>
            <MarkdownEditor value={form.description_en} onChange={(v) => setForm({ ...form, description_en: v })} rows={6} />
          </div>
          <div>
            <Label>Description (Bangla)</Label>
            <MarkdownEditor value={form.description_bn} onChange={(v) => setForm({ ...form, description_bn: v })} rows={6} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Playlist</Label>
              <Select value={form.playlist_id || "none"} onValueChange={(v) => setForm({ ...form, playlist_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {playlists.map((p) => <SelectItem key={p.id} value={p.id}>{p.title_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Speaker</Label>
              <Input value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} />
            </div>
            <div>
              <Label>Language</Label>
              <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">Bangla</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="ur">Urdu</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (sec)</Label>
              <Input type="number" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label>Published</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              <Label>Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Sort order</Label>
              <Input type="number" className="w-20" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !ytId || !form.title_en}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================ PLAYLISTS ============================

function PlaylistsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPlaylists);
  const delFn = useServerFn(adminDeletePlaylist);
  const catsFn = useServerFn(listVideoCategories);

  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<Playlist | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const pls = useQuery({ queryKey: ["admin-playlists", search], queryFn: () => listFn({ data: { q: search || undefined } }) });
  const cats = useQuery({ queryKey: ["video-cats"], queryFn: () => catsFn() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-playlists"] });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center justify-between flex-wrap">
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1.5" />New playlist</Button>
      </div>

      {pls.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !pls.data?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <ListVideo className="h-8 w-8 mx-auto mb-2 opacity-60" /> No playlists yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {(pls.data as Playlist[]).map((p) => (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              <div className="h-14 w-24 rounded bg-muted overflow-hidden flex-shrink-0">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center"><ListVideo className="h-5 w-5 text-muted-foreground" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{p.title_en}</p>
                  {!p.is_published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                  {p.is_featured && <Badge variant="outline" className="text-[10px]"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.category?.name_en ?? "—"} · /{p.slug}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PlaylistDialog
          initial={editing}
          categories={cats.data ?? []}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { invalidate(); setCreating(false); setEditing(null); }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this playlist?</AlertDialogTitle>
            <AlertDialogDescription>Videos in this playlist will be unlinked. This cannot be undone.</AlertDialogDescription>
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

function PlaylistDialog({
  initial, categories, onClose, onSaved,
}: { initial: Playlist | null; categories: Cat[]; onClose: () => void; onSaved: () => void }) {
  const upsertFn = useServerFn(adminUpsertPlaylist);
  const [form, setForm] = React.useState({
    title_en: initial?.title_en ?? "",
    title_bn: initial?.title_bn ?? "",
    description_en: initial?.description_en ?? "",
    description_bn: initial?.description_bn ?? "",
    category_id: initial?.category_id ?? "",
    cover_image_url: initial?.cover_image_url ?? "",
    youtube_playlist_id: initial?.youtube_playlist_id ?? "",
    is_published: initial?.is_published ?? false,
    is_featured: initial?.is_featured ?? false,
    sort_order: initial?.sort_order ?? 0,
  });

  const mut = useMutation({
    mutationFn: () => upsertFn({
      data: {
        id: initial?.id,
        title_en: form.title_en,
        title_bn: form.title_bn,
        description_en: form.description_en || null,
        description_bn: form.description_bn || null,
        category_id: form.category_id || null,
        cover_image_url: form.cover_image_url || null,
        youtube_playlist_id: form.youtube_playlist_id || null,
        is_published: form.is_published,
        is_featured: form.is_featured,
        sort_order: Number(form.sort_order) || 0,
      },
    }),
    onSuccess: () => { toast.success(initial ? "Updated" : "Created"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit playlist" : "New playlist"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Title (English) *</Label>
              <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
            </div>
            <div>
              <Label>Title (Bangla)</Label>
              <Input value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description (English)</Label>
            <MarkdownEditor value={form.description_en} onChange={(v) => setForm({ ...form, description_en: v })} rows={6} />
          </div>
          <div>
            <Label>Description (Bangla)</Label>
            <MarkdownEditor value={form.description_bn} onChange={(v) => setForm({ ...form, description_bn: v })} rows={6} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cover image URL</Label>
              <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label>Published</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              <Label>Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Sort</Label>
              <Input type="number" className="w-20" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.title_en}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================ CATEGORIES ============================

function CategoriesTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listVideoCategories);
  const delFn = useServerFn(adminDeleteVideoCategory);

  const cats = useQuery({ queryKey: ["video-cats"], queryFn: () => listFn() });
  const [editing, setEditing] = React.useState<Cat | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["video-cats"] }); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Group videos into browsable categories.</p>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1.5" />New category</Button>
      </div>

      {cats.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !cats.data?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Tag className="h-8 w-8 mx-auto mb-2 opacity-60" /> No categories yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {(cats.data as Cat[]).map((c) => (
            <Card key={c.id} className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: `${c.color ?? "#6366f1"}20`, color: c.color ?? "#6366f1" }}>
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
          onSaved={() => { qc.invalidateQueries({ queryKey: ["video-cats"] }); setCreating(false); setEditing(null); }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>Videos and playlists in this category will become uncategorized.</AlertDialogDescription>
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

function CategoryDialog({ initial, onClose, onSaved }: { initial: Cat | null; onClose: () => void; onSaved: () => void }) {
  const upsertFn = useServerFn(adminUpsertVideoCategory);
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
        <DialogHeader><DialogTitle>{initial ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name (English) *</Label>
              <Input value={form.name_en} onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, name_en: v, slug: autoSlug ? slugify(v) : f.slug }));
              }} />
            </div>
            <div>
              <Label>Name (Bangla) *</Label>
              <Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => { setAutoSlug(false); setForm({ ...form, slug: e.target.value }); }} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Color</Label>
              <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div>
              <Label>Icon (emoji or letter)</Label>
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
            {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
