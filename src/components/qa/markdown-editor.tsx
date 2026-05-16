import * as React from "react";
import { toast } from "sonner";
import { ImagePlus, Video as VideoIcon, Music, Eye, Pencil, Loader2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Markdown } from "./markdown";

type MediaKind = "image" | "video" | "audio";

const LIMITS: Record<MediaKind, number> = {
  image: 5 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

function detectKind(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

export function MarkdownEditor({
  value,
  onChange,
  rows = 10,
  placeholder,
  maxLength = 50000,
  mediaBucket = "qa-images",
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  mediaBucket?: string;
}) {
  const { user } = useAuth();
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const imgRef = React.useRef<HTMLInputElement>(null);
  const vidRef = React.useRef<HTMLInputElement>(null);
  const audRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState<MediaKind | null>(null);

  const insertAtCursor = (text: string) => {
    const el = ref.current;
    if (!el) {
      onChange(value + text);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleUpload = async (file: File, forced?: MediaKind) => {
    if (!user) {
      toast.error("Sign in to upload media");
      return;
    }
    const kind = forced ?? detectKind(file);
    if (!kind) {
      toast.error("Unsupported file type");
      return;
    }
    if (file.size > LIMITS[kind]) {
      toast.error(`${kind} must be under ${LIMITS[kind] / (1024 * 1024)}MB`);
      return;
    }
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "image" ? "png" : kind === "audio" ? "mp3" : "mp4");
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(mediaBucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(mediaBucket).getPublicUrl(path);
      const snippet =
        kind === "image"
          ? `\n\n![image](${data.publicUrl})\n\n`
          : kind === "video"
            ? `\n\n<video src="${data.publicUrl}" controls playsinline style="max-width:100%;border-radius:8px"></video>\n\n`
            : `\n\n<audio src="${data.publicUrl}" controls style="width:100%"></audio>\n\n`;
      insertAtCursor(snippet);
      toast.success(`${kind[0].toUpperCase() + kind.slice(1)} uploaded`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <Tabs defaultValue="write" className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <TabsList>
          <TabsTrigger value="write" className="gap-1"><Pencil className="h-3.5 w-3.5" /> Write</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1"><Eye className="h-3.5 w-3.5" /> Preview</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()} disabled={!!uploading}>
            {uploading === "image" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5 mr-1" />}
            Image
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => vidRef.current?.click()} disabled={!!uploading}>
            {uploading === "video" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <VideoIcon className="h-3.5 w-3.5 mr-1" />}
            Video
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => audRef.current?.click()} disabled={!!uploading}>
            {uploading === "audio" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Music className="h-3.5 w-3.5 mr-1" />}
            Audio
          </Button>
        </div>
        <input ref={imgRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "image"); e.target.value = ""; }} />
        <input ref={vidRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "video"); e.target.value = ""; }} />
        <input ref={audRef} type="file" accept="audio/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "audio"); e.target.value = ""; }} />
      </div>
      <TabsContent value="write" className="mt-0">
        <Textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          onPaste={async (e) => {
            const item = Array.from(e.clipboardData.items).find((i) =>
              i.type.startsWith("image/") || i.type.startsWith("video/") || i.type.startsWith("audio/"));
            if (item) {
              e.preventDefault();
              const f = item.getAsFile();
              if (f) await handleUpload(f);
            }
          }}
          onDrop={async (e) => {
            const f = e.dataTransfer.files?.[0];
            if (f && detectKind(f)) { e.preventDefault(); await handleUpload(f); }
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Markdown + raw HTML supported. Drag, paste, or use the buttons to embed image, audio, or video.
        </p>
      </TabsContent>
      <TabsContent value="preview" className="mt-0">
        <div className="min-h-[200px] rounded-md border bg-card p-4">
          {value.trim() ? (
            <Markdown source={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
