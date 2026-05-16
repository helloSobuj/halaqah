import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, Lock, Unlock, Trash2, RotateCcw, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listFlags, resolveFlag, adminListQuestions, adminToggleLock, adminToggleDelete,
} from "@/lib/qa.functions";

export const Route = createFileRoute("/_authenticated/admin/qa")({
  head: () => ({ meta: [{ title: "Admin · Q&A — Halaqah" }] }),
  component: AdminQAPage,
});

function AdminQAPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Q&amp;A moderation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review flagged content and manage questions.
        </p>
      </div>

      <Tabs defaultValue="flags">
        <TabsList>
          <TabsTrigger value="flags"><Flag className="h-3.5 w-3.5 mr-1.5" />Flags</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>
        <TabsContent value="flags" className="mt-4">
          <FlagsTab />
        </TabsContent>
        <TabsContent value="questions" className="mt-4">
          <QuestionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FlagsTab() {
  const qc = useQueryClient();
  const fn = useServerFn(listFlags);
  const resolveFn = useServerFn(resolveFlag);
  const q = useQuery({ queryKey: ["admin-qa-flags"], queryFn: () => fn() });

  const mut = useMutation({
    mutationFn: (input: { flagId: string; action: "dismiss" | "delete_target" | "lock_question" }) =>
      resolveFn({ data: input }),
    onSuccess: () => {
      toast.success("Flag resolved");
      qc.invalidateQueries({ queryKey: ["admin-qa-flags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!q.data?.length) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No open flags. 🎉
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {q.data.map((f: any) => (
        <Card key={f.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="destructive">{f.target_type}</Badge>
                <span className="text-sm font-medium">{f.reason}</span>
                <span className="text-xs text-muted-foreground">by {f.reporter}</span>
              </div>
              {f.target_type === "question" ? (
                <div>
                  <Link
                    to="/qa/$questionId"
                    params={{ questionId: f.target_id }}
                    className="font-semibold hover:underline"
                  >
                    {f.preview.title}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{f.preview.body}</p>
                </div>
              ) : (
                <div>
                  <Link
                    to="/qa/$questionId"
                    params={{ questionId: f.preview.questionId }}
                    className="text-sm text-primary hover:underline"
                  >
                    View question
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{f.preview.body}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => mut.mutate({ flagId: f.id, action: "dismiss" })}>
              Dismiss
            </Button>
            <Button size="sm" variant="outline" onClick={() => mut.mutate({ flagId: f.id, action: "lock_question" })}>
              <Lock className="h-3.5 w-3.5 mr-1.5" /> Lock question
            </Button>
            <Button size="sm" variant="destructive" onClick={() => mut.mutate({ flagId: f.id, action: "delete_target" })}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete {f.target_type}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function QuestionsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "deleted" | "locked" | "needs_review">("all");
  const fn = useServerFn(adminListQuestions);
  const lockFn = useServerFn(adminToggleLock);
  const delFn = useServerFn(adminToggleDelete);

  const q = useQuery({
    queryKey: ["admin-qa-questions", filter, search],
    queryFn: () => fn({ data: { filter, q: search || undefined } }),
  });

  const lockMut = useMutation({
    mutationFn: (input: { id: string; locked: boolean }) => lockFn({ data: input }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-qa-questions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (input: { id: string; deleted: boolean }) => delFn({ data: input }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-qa-questions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="needs_review">Needs scholar review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {q.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !q.data?.length ? (
        <Card className="p-8 text-center text-muted-foreground">No questions match.</Card>
      ) : (
        <div className="space-y-2">
          {q.data.map((row: any) => (
            <Card key={row.id} className="p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <Link
                  to="/qa/$questionId"
                  params={{ questionId: row.id }}
                  className="font-medium hover:underline truncate block"
                >
                  {row.title}
                </Link>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{row.author}</span>
                  <span>· {row.answer_count} answers</span>
                  <span>· {row.vote_score} votes</span>
                  {row.is_deleted && <Badge variant="destructive">deleted</Badge>}
                  {row.is_locked && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />locked</Badge>}
                  {row.scholar_review_required && <Badge>needs review</Badge>}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => lockMut.mutate({ id: row.id, locked: !row.is_locked })}
                >
                  {row.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="sm"
                  variant={row.is_deleted ? "outline" : "destructive"}
                  onClick={() => delMut.mutate({ id: row.id, deleted: !row.is_deleted })}
                >
                  {row.is_deleted ? <RotateCcw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
