import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";

export type LeaderRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_score: number;
  total_points: number;
  attempts: number;
  best_time: number | null;
};

const RANK_ICON = [Trophy, Medal, Award];

export function LeaderboardTable({ rows }: { rows: LeaderRow[] }) {
  const { t } = useTranslation();
  if (rows.length === 0)
    return <div className="p-6 text-sm text-muted-foreground text-center">{t("quiz.leaderboardEmpty")}</div>;
  return (
    <ol className="divide-y divide-border">
      {rows.map((r, i) => {
        const Icon = RANK_ICON[i];
        const initials = (r.display_name ?? "U").slice(0, 2).toUpperCase();
        return (
          <li key={r.user_id} className="flex items-center gap-3 py-3 px-4">
            <div className="w-8 text-center">
              {Icon ? (
                <Icon
                  className={
                    i === 0
                      ? "h-5 w-5 text-amber-500 mx-auto"
                      : i === 1
                        ? "h-5 w-5 text-slate-400 mx-auto"
                        : "h-5 w-5 text-orange-600 mx-auto"
                  }
                />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">{i + 1}</span>
              )}
            </div>
            <Avatar className="h-9 w-9">
              <AvatarImage src={r.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/15 text-primary text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">{r.display_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {r.attempts} {t("quiz.attempts")}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-primary">{r.total_points}</div>
              <div className="text-[11px] text-muted-foreground">{t("quiz.pts")}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
