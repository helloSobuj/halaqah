import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Trophy, Medal, Award, Sparkles, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type SubmitResult = {
  attempt_id: string;
  score: number;
  total: number;
  points_awarded: number;
  rank: number;
  new_badges: { code: string }[];
};

const PODIUM: Record<string, { Icon: typeof Trophy; tone: string; label: string }> = {
  gold: { Icon: Trophy, tone: "text-amber-500", label: "1st" },
  silver: { Icon: Medal, tone: "text-slate-400", label: "2nd" },
  bronze: { Icon: Award, tone: "text-orange-600", label: "3rd" },
};

export function ResultSummary({
  result,
  quizId,
  categorySlug,
}: {
  result: SubmitResult;
  quizId: string;
  categorySlug?: string;
}) {
  const { t } = useTranslation();
  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  return (
    <Card className="p-8 lg:p-10 max-w-xl mx-auto text-center shadow-elegant">
      <div className="mx-auto h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center mb-4">
        <Sparkles className="h-9 w-9 text-primary" />
      </div>
      <h2 className="text-3xl font-bold text-foreground">{pct}%</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {t("quiz.scoreOf", { score: result.score, total: result.total })}
      </p>

      <div className="grid grid-cols-3 gap-3 mt-6">
        <Stat label={t("quiz.points")} value={`+${result.points_awarded}`} />
        <Stat label={t("quiz.rank")} value={`#${result.rank}`} />
        <Stat label={t("quiz.correct")} value={`${result.score}/${result.total}`} />
      </div>

      {result.new_badges.length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
            {t("quiz.badgesEarned")}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {result.new_badges.map((b, i) => {
              const meta = PODIUM[b.code];
              if (meta) {
                const Icon = meta.Icon;
                return (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium"
                >
                  <Target className="h-3.5 w-3.5" />
                  {t(`quiz.badge.${b.code}`, { defaultValue: b.code })}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 justify-center mt-7">
        <Button asChild variant="outline">
          <Link to={categorySlug ? "/quiz/$category" : "/quiz"} params={categorySlug ? { category: categorySlug } : undefined}>
            {t("quiz.moreQuizzes")}
          </Link>
        </Button>
        <Button asChild>
          <Link to="/quiz/leaderboard" search={{ quizId } as never}>
            {t("quiz.viewLeaderboard")}
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
