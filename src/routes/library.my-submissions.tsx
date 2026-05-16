import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus, BookOpen } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { myBookSubmissions } from "@/lib/library.functions";

export const Route = createFileRoute("/library/my-submissions")({
  head: () => ({ meta: [{ title: "My submissions — Halaqah" }] }),
  component: MySubmissionsPage,
});

function statusVariant(s: string): "default" | "secondary" | "destructive" {
  if (s === "approved") return "default";
  if (s === "rejected") return "destructive";
  return "secondary";
}

function MySubmissionsPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const fn = useServerFn(myBookSubmissions);
  const q = useQuery({
    queryKey: ["my-book-subs"],
    queryFn: () => fn(),
    enabled: !!user,
  });

  if (!loading && !user) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto p-10 text-center space-y-3">
          <p>{t("library.signInToView", "Sign in to view your submissions.")}</p>
          <Link to="/login"><Button>{t("auth.signIn", "Sign in")}</Button></Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-5">
        <Link to="/library" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("library.backToLibrary", "Back to library")}
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{t("library.mySubmissions", "My submissions")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("library.mySubmissionsDesc", "Track the status of books you've submitted.")}
            </p>
          </div>
          <Link to="/library/submit">
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />{t("library.submit", "Submit a book")}</Button>
          </Link>
        </div>

        {q.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !q.data?.length ? (
          <Card className="p-10 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-60" />
            {t("library.noSubmissionsYet", "You haven't submitted any books yet.")}
          </Card>
        ) : (
          <div className="space-y-2">
            {q.data.map((b: any) => (
              <Card key={b.id} className="p-4 flex items-start gap-3">
                <div className="h-16 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                  {b.cover_image_url ? (
                    <img src={b.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium truncate">{b.title}</h3>
                    <Badge variant={statusVariant(b.status)} className="text-[10px] capitalize">
                      {String(t(`library.status.${b.status}`, b.status))}
                    </Badge>
                  </div>
                  {b.author && <p className="text-xs text-muted-foreground mt-0.5">{b.author}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(b.created_at).toLocaleString()} · {b.language.toUpperCase()} · {b.source_type === "pdf" ? "PDF" : t("library.externalLink", "External link")}
                  </p>
                  {b.status === "rejected" && b.rejection_reason && (
                    <p className="text-xs text-destructive mt-2">
                      <span className="font-medium">{t("library.rejectionReason", "Reason")}:</span> {b.rejection_reason}
                    </p>
                  )}
                  {b.status === "approved" && (
                    <Link to="/library/$bookId" params={{ bookId: b.slug }} className="text-xs text-primary underline mt-2 inline-block">
                      {t("library.viewBook", "View book")}
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
