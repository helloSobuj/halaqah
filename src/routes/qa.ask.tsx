import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listQACategories, createQuestion } from "@/lib/qa.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/qa/ask")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Ask a question — Halaqah" }] }),
  component: AskPage,
});

function AskPage() {
  const navigate = useNavigate();
  const catsFn = useServerFn(listQACategories);
  const createFn = useServerFn(createQuestion);
  const cats = useQuery({ queryKey: ["qa-cats"], queryFn: () => catsFn() });

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | undefined>();
  const [language, setLanguage] = React.useState<"en" | "bn" | "both">("en");
  const [tagInput, setTagInput] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [anon, setAnon] = React.useState(false);

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (!v || tags.includes(v) || tags.length >= 5) return;
    setTags([...tags, v]);
    setTagInput("");
  };

  const mut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: title.trim(),
          body: body.trim(),
          categoryId: categoryId ?? null,
          language,
          tags,
          isAnonymous: anon,
        },
      }),
    onSuccess: (r) => {
      toast.success("Question posted!");
      navigate({ to: "/qa/$questionId", params: { questionId: r.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to post"),
  });

  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;
  const valid = titleLen >= 10 && bodyLen >= 20;
  const disabledReason = !valid
    ? titleLen < 10
      ? `Title needs ${10 - titleLen} more character${10 - titleLen === 1 ? "" : "s"}`
      : `Details need ${20 - bodyLen} more character${20 - bodyLen === 1 ? "" : "s"}`
    : null;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-4">
        <Link to="/qa" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Q&amp;A
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold">Ask a question</h1>
        <Card className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Be specific. e.g. What breaks the fast besides eating and drinking?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{title.length}/200 — min 10 characters.</p>
          </div>

          <div className="space-y-2">
            <Label>Question details (markdown supported)</Label>
            <Textarea
              rows={10}
              placeholder="Describe your question with context, what you've already considered, and any references."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={20000}
            />
            <p className="text-xs text-muted-foreground">{body.length} characters — min 20.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {cats.data?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">বাংলা</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags (up to 5)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="e.g. ramadan, salah"
                maxLength={30}
              />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setTags(tags.filter((x) => x !== t))}>
                    {t} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Post anonymously</p>
              <p className="text-xs text-muted-foreground">Your name won't appear publicly. Mods can still see it.</p>
            </div>
            <Switch checked={anon} onCheckedChange={setAnon} />
          </div>

          <div className="flex justify-end items-center gap-3">
            {disabledReason && (
              <p className="text-xs text-muted-foreground">{disabledReason}</p>
            )}
            <Button variant="outline" asChild><Link to="/qa">Cancel</Link></Button>
            <Button
              onClick={() => {
                if (!valid) {
                  toast.error(disabledReason ?? "Please complete the form");
                  return;
                }
                mut.mutate();
              }}
              disabled={mut.isPending}
            >
              {mut.isPending ? "Posting…" : "Post question"}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
