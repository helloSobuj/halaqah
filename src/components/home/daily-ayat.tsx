import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDailyAyat } from "@/lib/ayat.functions";
import { useLanguage } from "@/hooks/use-language";

function toBnDigits(n: number | string) {
  const map = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(n).replace(/\d/g, (d) => map[Number(d)]);
}

export function DailyAyat() {
  const { lang } = useLanguage();
  const isBn = lang === "bn";
  const fn = useServerFn(getDailyAyat);
  const { data, isLoading } = useQuery({
    queryKey: ["daily-ayat"],
    queryFn: () => fn(),
    staleTime: 60 * 60_000,
    retry: 1,
  });

  const surahName = data ? (isBn ? data.surah_name_bn : data.surah_name_en) : "";
  const ref = data
    ? isBn
      ? `সূরা ${surahName} • ${toBnDigits(data.surah_number)}:${toBnDigits(data.ayat_number)}`
      : `Surah ${surahName} • ${data.surah_number}:${data.ayat_number}`
    : "";

  return (
    <Card className="p-5 h-full flex flex-col bg-gradient-to-br from-accent/30 to-primary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">{isBn ? "আজকের আয়াত" : "Ayat of the day"}</h3>
          <p className="text-[11px] text-muted-foreground">{ref || (isBn ? "কুরআন থেকে" : "From the Quran")}</p>
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
          <p className="text-[11px] text-muted-foreground italic pt-1">— {ref}</p>
        </div>
      )}
    </Card>
  );
}
