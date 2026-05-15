import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminListAttempts, adminListQuizzes } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/admin/quiz/attempts")({
  component: AttemptsAdmin,
});

type AttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  points_awarded: number;
  time_taken_seconds: number;
  completed_at: string;
  ip_address: string | null;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
  quizzes: { title_en: string; title_bn: string } | null;
};

function AttemptsAdmin() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const [quizId, setQuizId] = React.useState<string>("__all");

  const listQuizzesFn = useServerFn(adminListQuizzes);
  const listAttemptsFn = useServerFn(adminListAttempts);

  const quizzes = useQuery({ queryKey: ["admin-quizzes"], queryFn: () => listQuizzesFn() });
  const attempts = useQuery({
    queryKey: ["admin-attempts", quizId],
    queryFn: () =>
      listAttemptsFn({
        data: { quizId: quizId === "__all" ? null : quizId, limit: 100 },
      }),
  });

  const rows = (attempts.data ?? []) as AttemptRow[];

  return (
    <div className="space-y-4">
      <Link to="/admin/quiz" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("admin.quiz.title")}
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-foreground">{t("admin.attempts.title")}</h2>
        <div className="w-64">
          <Select value={quizId} onValueChange={setQuizId}>
            <SelectTrigger>
              <SelectValue placeholder={t("admin.attempts.filterByQuiz")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">{t("admin.attempts.all")}</SelectItem>
              {quizzes.data?.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {isBn ? q.title_bn : q.title_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">{t("admin.attempts.user")}</th>
                <th className="text-left p-3 font-medium">{t("admin.attempts.quiz")}</th>
                <th className="text-right p-3 font-medium">{t("admin.attempts.score")}</th>
                <th className="text-right p-3 font-medium">{t("admin.attempts.points")}</th>
                <th className="text-right p-3 font-medium">{t("admin.attempts.time")}</th>
                <th className="text-left p-3 font-medium">{t("admin.attempts.when")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.isLoading && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{t("common.loading")}</td></tr>
              )}
              {!attempts.isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t("admin.attempts.empty")}</td></tr>
              )}
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="p-3 text-foreground">{a.profiles?.display_name ?? a.user_id.slice(0, 8)}</td>
                  <td className="p-3 text-foreground">{a.quizzes ? (isBn ? a.quizzes.title_bn : a.quizzes.title_en) : "—"}</td>
                  <td className="p-3 text-right tabular-nums">{a.score}/{a.total}</td>
                  <td className="p-3 text-right tabular-nums">{a.points_awarded}</td>
                  <td className="p-3 text-right tabular-nums">{a.time_taken_seconds}s</td>
                  <td className="p-3 text-muted-foreground">{new Date(a.completed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
