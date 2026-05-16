import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, Bell, CheckCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/shared/markdown";
import { listNotices, markAllNoticesRead } from "@/lib/notices.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/notices")({
  head: () => ({ meta: [
    { title: "Notices — Halaqah" },
    { name: "description", content: "Announcements and updates from the Halaqah community." },
  ] }),
  component: NoticesPage,
});

type Notice = {
  id: string;
  title_en: string;
  title_bn: string;
  body_md_en: string;
  body_md_bn: string;
  priority: "normal" | "important" | "urgent";
  is_pinned: boolean;
  published_at: string | null;
};

function priorityBadge(p: Notice["priority"]) {
  if (p === "urgent") return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-0">Urgent</Badge>;
  if (p === "important") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0">Important</Badge>;
  return null;
}

function NoticesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listNotices);
  const markAllFn = useServerFn(markAllNoticesRead);

  const notices = useQuery({
    queryKey: ["notices-public", "all"],
    queryFn: () => listFn({ data: { limit: 50 } }) as Promise<Notice[]>,
  });

  const markAll = useMutation({
    mutationFn: () => markAllFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unread-notices"] }),
  });

  React.useEffect(() => {
    if (user) markAll.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 lg:py-12 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-7 w-7 text-primary" />
              Notices
            </h1>
            <p className="text-muted-foreground mt-1">Announcements and updates from the community.</p>
          </div>
          {user && (notices.data?.length ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
              <CheckCheck className="h-4 w-4 mr-1.5" /> Mark all read
            </Button>
          )}
        </div>

        {notices.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : !notices.data?.length ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-60" />
            No notices yet. Check back soon.
          </Card>
        ) : (
          <div className="space-y-4">
            {notices.data.map((n) => (
              <Card key={n.id} className="p-5 border-border">
                <div className="flex items-start gap-3 mb-2">
                  {n.is_pinned && <Pin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-foreground">{n.title_en}</h2>
                      {priorityBadge(n.priority)}
                    </div>
                    {n.published_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(n.published_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {n.body_md_en?.trim() && (
                  <div className="prose prose-sm dark:prose-invert max-w-none mt-3">
                    <Markdown source={n.body_md_en} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
