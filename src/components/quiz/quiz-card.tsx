import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Clock, ListChecks, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReminderButton } from "@/components/quiz/reminder-button";
import { formatInTz } from "@/lib/timezone";

type Quiz = {
  id: string;
  title_en: string;
  title_bn: string;
  description_en?: string | null;
  description_bn?: string | null;
  difficulty: string;
  time_limit_seconds: number;
  question_count?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  timezone?: string | null;
  quiz_categories?: { name_en: string; name_bn: string; color?: string | null } | null;
};

const DIFF_TONE: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  hard: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function useNow(active: boolean) {
  const [now, setNow] = React.useState<number>(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function formatDelta(ms: number): string {
  if (ms <= 0) return "0s";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function QuizCard({
  quiz,
  bookmarked,
  onToggleBookmark,
}: {
  quiz: Quiz;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const title = isBn ? quiz.title_bn : quiz.title_en;
  const desc = isBn ? quiz.description_bn : quiz.description_en;
  const cat = isBn ? quiz.quiz_categories?.name_bn : quiz.quiz_categories?.name_en;

  const tz = quiz.timezone || "UTC";
  const startsAtMs = quiz.starts_at ? new Date(quiz.starts_at).getTime() : null;
  const endsAtMs = quiz.ends_at ? new Date(quiz.ends_at).getTime() : null;
  const isFutureStart = !!startsAtMs && startsAtMs > Date.now();
  const now = useNow(isFutureStart);
  const isEnded = !!endsAtMs && endsAtMs < now;
  const remainingMs = startsAtMs ? Math.max(0, startsAtMs - now) : 0;
  const locked = isFutureStart || isEnded;

  return (
    <Card className="p-5 hover:border-primary/40 hover:shadow-elegant transition-all flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {cat && <div className="text-[11px] font-medium text-primary mb-1">{cat}</div>}
          <h3 className="font-semibold text-foreground line-clamp-2">{title}</h3>
          {desc && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{desc}</p>}
        </div>
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            aria-label="bookmark"
          >
            {bookmarked ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Badge variant="secondary" className={DIFF_TONE[quiz.difficulty] ?? ""}>
          {t(`quiz.difficulty.${quiz.difficulty}`)}
        </Badge>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" /> {quiz.question_count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {Math.round(quiz.time_limit_seconds / 60)}m
        </span>
      </div>

      {quiz.starts_at && (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-foreground">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{t("quiz.startsAt", { defaultValue: "Starts at" })}:</span>
            <span className="text-muted-foreground">{formatInTz(quiz.starts_at, tz, isBn ? "bn-BD" : "en-US")}</span>
          </div>
          {isFutureStart && (
            <div className="mt-1 text-primary font-semibold tabular-nums">
              {t("quiz.startsIn", { defaultValue: "Starts in" })} {formatDelta(remainingMs)}
            </div>
          )}
          {isEnded && (
            <div className="mt-1 text-rose-600 font-semibold">
              {t("quiz.ended", { defaultValue: "Ended" })}
            </div>
          )}
          {isFutureStart && (
            <div className="mt-2"><ReminderButton quizId={quiz.id} /></div>
          )}
        </div>
      )}

      <Button asChild={!locked} disabled={locked} className="mt-4 w-full" size="sm">
        {locked ? (
          <span>{isEnded ? t("quiz.ended", { defaultValue: "Ended" }) : t("quiz.notStarted", { defaultValue: "Not started yet" })}</span>
        ) : (
          <Link to="/quiz/play/$quizId" params={{ quizId: quiz.id }}>
            {t("quiz.start")}
          </Link>
        )}
      </Button>
    </Card>
  );
}
