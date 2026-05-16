import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookHeart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDailyHadith } from "@/lib/hadith.functions";
import { useLanguage } from "@/hooks/use-language";

export function DailyHadith() {
  const { lang } = useLanguage();
  const isBn = lang === "bn";
  const fn = useServerFn(getDailyHadith);
  const { data, isLoading } = useQuery({
    queryKey: ["daily-hadith"],
    queryFn: () => fn(),
    staleTime: 60 * 60_000, // 1 hour client-side
    retry: 1,
  });

  return (
    <Card className="p-5 h-full flex flex-col bg-gradient-to-br from-primary/5 to-accent/30 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <BookHeart className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">{isBn ? "আজকের হাদিস" : "Hadith of the day"}</h3>
          <p className="text-[11px] text-muted-foreground">{isBn ? "প্রতিদিনের প্রতিফলন" : "Daily reflection"}</p>
        </div>
      </div>
      {isLoading || !data ? (
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <div className="space-y-2 flex-1 min-h-0">
          <p className="text-right font-arabic text-base leading-relaxed text-foreground line-clamp-3" dir="rtl" lang="ar">
            {data.arabic}
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed line-clamp-4">
            {isBn && data.bn ? data.bn : data.en}
          </p>
          <p className="text-[11px] text-muted-foreground italic pt-1">— {data.source}</p>
        </div>
      )}
    </Card>
  );
}
