import * as React from "react";
import { toast } from "sonner";
import { Loader2, Upload, ImagePlus, FileText, Link as LinkIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarkdownEditor } from "@/components/qa/markdown-editor";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type BookFormValue = {
  title: string;
  author: string;
  description: string;
  language: "ar" | "en" | "bn" | "ur" | "other";
  category_id: string | null;
  cover_image_url: string | null;
  published_year: number | null;
  pages: number | null;
  source_type: "pdf" | "external";
  pdf_path: string | null;
  pdf_size_bytes: number | null;
  external_url: string | null;
};

export const emptyBook: BookFormValue = {
  title: "",
  author: "",
  description: "",
  language: "en",
  category_id: null,
  cover_image_url: null,
  published_year: null,
  pages: null,
  source_type: "pdf",
  pdf_path: null,
  pdf_size_bytes: null,
  external_url: null,
};

export function BookForm({
  value,
  onChange,
  categories,
}: {
  value: BookFormValue;
  onChange: (v: BookFormValue) => void;
  categories: { id: string; name_en: string; name_bn: string }[];
}) {
  const { user } = useAuth();
  const coverRef = React.useRef<HTMLInputElement>(null);
  const pdfRef = React.useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [uploadingPdf, setUploadingPdf] = React.useState(false);

  const patch = (p: Partial<BookFormValue>) => onChange({ ...value, ...p });

  const uploadCover = async (file: File) => {
    if (!user) return toast.error("Sign in first");
    if (!file.type.startsWith("image/")) return toast.error("Please pick an image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/covers/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("library-books").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("library-books").getPublicUrl(path);
      patch({ cover_image_url: data.publicUrl });
      toast.success("Cover uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingCover(false);
    }
  };

  const uploadPdf = async (file: File) => {
    if (!user) return toast.error("Sign in first");
    if (file.type !== "application/pdf") return toast.error("Please pick a PDF file");
    if (file.size > 100 * 1024 * 1024) return toast.error("Max 100MB");
    setUploadingPdf(true);
    try {
      const path = `${user.id}/pdfs/${crypto.randomUUID()}.pdf`;
      const { error } = await supabase.storage
        .from("library-books")
        .upload(path, file, { upsert: false, contentType: "application/pdf" });
      if (error) throw error;
      const { data } = supabase.storage.from("library-books").getPublicUrl(path);
      patch({ pdf_path: data.publicUrl, pdf_size_bytes: file.size });
      toast.success("PDF uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Title *</Label>
        <Input value={value.title} onChange={(e) => patch({ title: e.target.value })} maxLength={255} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Author</Label>
          <Input value={value.author} onChange={(e) => patch({ author: e.target.value })} maxLength={255} />
        </div>
        <div>
          <Label>Language *</Label>
          <Select value={value.language} onValueChange={(v) => patch({ language: v as BookFormValue["language"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">Arabic</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="bn">Bangla</SelectItem>
              <SelectItem value="ur">Urdu</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <Label>Category</Label>
          <Select
            value={value.category_id ?? "none"}
            onValueChange={(v) => patch({ category_id: v === "none" ? null : v })}
          >
            <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Published year</Label>
          <Input
            type="number"
            value={value.published_year ?? ""}
            onChange={(e) => patch({ published_year: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div>
          <Label>Pages</Label>
          <Input
            type="number"
            value={value.pages ?? ""}
            onChange={(e) => patch({ pages: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <MarkdownEditor
          value={value.description}
          onChange={(v) => patch({ description: v })}
          rows={8}
          maxLength={5000}
          placeholder="Write a short summary or notes about this book…"
        />
      </div>

      <div className="space-y-2">
        <Label>Cover image</Label>
        <div className="flex items-center gap-3">
          {value.cover_image_url ? (
            <div className="relative h-24 w-18 rounded overflow-hidden border">
              <img src={value.cover_image_url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => patch({ cover_image_url: null })}
                className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="h-24 w-18 rounded border-2 border-dashed flex items-center justify-center text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadCover(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadingCover}
            onClick={() => coverRef.current?.click()}
          >
            {uploadingCover ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            {value.cover_image_url ? "Replace" : "Upload"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Source *</Label>
        <Tabs value={value.source_type} onValueChange={(v) => patch({ source_type: v as "pdf" | "external" })}>
          <TabsList>
            <TabsTrigger value="pdf"><FileText className="h-4 w-4 mr-1.5" />PDF file</TabsTrigger>
            <TabsTrigger value="external"><LinkIcon className="h-4 w-4 mr-1.5" />External link</TabsTrigger>
          </TabsList>
        </Tabs>

        {value.source_type === "pdf" ? (
          <div className="border rounded-lg p-3 space-y-2">
            {value.pdf_path ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="truncate flex-1">PDF uploaded</span>
                <span className="text-xs text-muted-foreground">
                  {value.pdf_size_bytes ? `${(value.pdf_size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => patch({ pdf_path: null, pdf_size_bytes: null })}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No PDF uploaded yet. Max 100MB.</p>
            )}
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPdf(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingPdf}
              onClick={() => pdfRef.current?.click()}
            >
              {uploadingPdf ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
              {value.pdf_path ? "Replace PDF" : "Upload PDF"}
            </Button>
          </div>
        ) : (
          <div>
            <Input
              type="url"
              placeholder="https://archive.org/details/…"
              value={value.external_url ?? ""}
              onChange={(e) => patch({ external_url: e.target.value || null })}
              maxLength={2048}
            />
          </div>
        )}
      </div>
    </div>
  );
}
