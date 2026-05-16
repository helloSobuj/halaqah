import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookForm, emptyBook, BookFormValue } from "@/components/library/book-form";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyBookSubmission,
  updateMyBookSubmission,
  listLibraryCategories,
} from "@/lib/library.functions";

export const Route = createFileRoute("/library/edit/$bookId")({
  head: () => ({ meta: [{ title: "Edit submission — Halaqah" }] }),
  component: EditPage,
});

function EditPage() {
  const { bookId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const getFn = useServerFn(getMyBookSubmission);
  const updateFn = useServerFn(updateMyBookSubmission);
  const catsFn = useServerFn(listLibraryCategories);

  const cats = useQuery({ queryKey: ["library-cats"], queryFn: () => catsFn() });
  const book = useQuery({
    queryKey: ["my-book-sub", bookId],
    queryFn: () => getFn({ data: { id: bookId } }),
    enabled: !!user,
  });

  const [form, setForm] = React.useState<BookFormValue>(emptyBook);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    if (book.data && !loaded) {
      const b: any = book.data;
      setForm({
        title: b.title ?? "",
        author: b.author ?? "",
        description: b.description ?? "",
        language: b.language ?? "en",
        category_id: b.category_id ?? null,
        cover_image_url: b.cover_image_url ?? null,
        published_year: b.published_year ?? null,
        pages: b.pages ?? null,
        source_type: b.source_type ?? "pdf",
        pdf_path: b.pdf_path ?? null,
        pdf_size_bytes: b.pdf_size_bytes ?? null,
        external_url: b.external_url ?? null,
      });
      setLoaded(true);
    }
  }, [book.data, loaded]);

  const mut = useMutation({
    mutationFn: () => updateFn({ data: { id: bookId, ...form } as any }),
    onSuccess: () => {
      toast.success("Submission updated. It will be re-reviewed.");
      nav({ to: "/library/my-submissions" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!loading && !user) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto p-10 text-center space-y-3">
          <p>Sign in to edit your submission.</p>
          <Link to="/login"><Button>Sign in</Button></Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-5">
        <Link to="/library/my-submissions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to my submissions
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Edit submission</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Updating your submission will set it back to pending review.
          </p>
        </div>
        {book.isLoading || !loaded ? (
          <Skeleton className="h-96 w-full" />
        ) : book.isError ? (
          <Card className="p-6 text-sm text-destructive">{(book.error as Error).message}</Card>
        ) : (
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
                Save changes
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
