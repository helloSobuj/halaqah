import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Bookmark, BookmarkCheck, Clock, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Quiz = {
  id: string;
  title_en: string;
  title_bn: string;
  description_en?: string | null;
  description_bn?: string | null;
  difficulty: string;
  time_limit_seconds: number;
  question_count?: number;
  quiz_categories?: { name_en: string; name_bn: string; color?: string | null } | null;
};

const DIFF_TONE: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  hard: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

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
      <Button asChild className="mt-4 w-full" size="sm">
        <Link to="/quiz/play/$quizId" params={{ quizId: quiz.id }}>
          {t("quiz.start")}
        </Link>
      </Button>
    </Card>
  );
}
