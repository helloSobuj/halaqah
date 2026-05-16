import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookForm, emptyBook, BookFormValue } from "@/components/library/book-form";
import { useAuth } from "@/hooks/use-auth";
import { submitBook, listLibraryCategories } from "@/lib/library.functions";

export const Route = createFileRoute("/library/submit")({
  head: () => ({ meta: [{ title: "Submit a book — Halaqah" }] }),
  component: SubmitPage,
});

function SubmitPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = React.useState<BookFormValue>(emptyBook);

  const submitFn = useServerFn(submitBook);
  const catsFn = useServerFn(listLibraryCategories);
  const cats = useQuery({ queryKey: ["library-cats"], queryFn: () => catsFn() });

  const mut = useMutation({
    mutationFn: () => submitFn({ data: form as any }),
    onSuccess: () => {
      toast.success("Submitted! An admin will review it shortly.");
      nav({ to: "/library/my-submissions" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!loading && !user) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto p-10 text-center space-y-3">
          <p>Sign in to submit a book.</p>
          <Link to="/login"><Button>Sign in</Button></Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-5">
        <Link to="/library" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Submit a book</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share an Islamic book with the community. Submissions are reviewed before going public.
          </p>
        </div>
        <Card className="p-5">
          <BookForm value={form} onChange={setForm} categories={cats.data ?? []} />
          <div className="flex justify-end pt-4">
            <Button
              disabled={
                mut.isPending ||
                !form.title.trim() ||
                (form.source_type === "pdf" ? !form.pdf_path : !form.external_url)
              }
              onClick={() => mut.mutate()}
            >
              {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Submit for review
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
