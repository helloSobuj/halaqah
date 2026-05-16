import * as React from "react";
import { toast } from "sonner";
import { ImagePlus, Eye, Pencil, Loader2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Markdown } from "./markdown";

export function MarkdownEditor({
  value,
  onChange,
  rows = 10,
  placeholder,
  maxLength = 20000,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  const { user } = useAuth();
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

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

  const handleUpload = async (file: File) => {
    if (!user) {
      toast.error("Sign in to upload images");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files allowed");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("qa-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("qa-images").getPublicUrl(path);
      insertAtCursor(`\n\n![image](${data.publicUrl})\n\n`);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Tabs defaultValue="write" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="write" className="gap-1"><Pencil className="h-3.5 w-3.5" /> Write</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1"><Eye className="h-3.5 w-3.5" /> Preview</TabsTrigger>
        </TabsList>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5 mr-1" />}
          {uploading ? "Uploading…" : "Add image"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
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
            const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
            if (item) {
              e.preventDefault();
              const f = item.getAsFile();
              if (f) await handleUpload(f);
            }
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Markdown supported. Paste or use Add image to embed pictures.
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
