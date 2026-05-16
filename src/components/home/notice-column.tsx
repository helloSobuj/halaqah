import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Pin, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listNotices } from "@/lib/notices.functions";
import { useLanguage } from "@/hooks/use-language";

type NoticeRow = {
  id: string;
  title_en: string;
  title_bn: string;
  cover_image_url: string | null;
  priority: "normal" | "important" | "urgent";
  is_pinned: boolean;
  published_at: string | null;
};

export function NoticeColumn() {
  const { lang } = useLanguage();
  const isBn = lang === "bn";
  const fn = useServerFn(listNotices);
  const { data } = useQuery({
    queryKey: ["notices-public", "home"],
    queryFn: () => fn({ data: { limit: 5 } }) as unknown as Promise<NoticeRow[]>,
    staleTime: 5 * 60_000,
  });
  const items = data ?? [];

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          {isBn ? "নোটিশ বোর্ড" : "Notice board"}
        </h3>
        <Link to="/notices" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          {isBn ? "সব" : "All"} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {!items.length ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground text-center py-6">
          {isBn ? "এখনো কোনো নোটিশ নেই।" : "No notices yet."}
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {items.map((n) => {
            const title = isBn && n.title_bn ? n.title_bn : n.title_en;
            return (
              <Link key={n.id} to="/notices" className="block group">
                <div className="rounded-lg border border-border/60 p-2.5 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start gap-2">
                    {n.is_pinned && <Pin className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {n.priority === "urgent" && (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-0 text-[10px] px-1.5 py-0">
                            {isBn ? "জরুরি" : "Urgent"}
                          </Badge>
                        )}
                        {n.priority === "important" && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0 text-[10px] px-1.5 py-0">
                            {isBn ? "গুরুত্বপূর্ণ" : "Important"}
                          </Badge>
                        )}
                        {n.published_at && (
                          <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                            {new Date(n.published_at).toLocaleDateString(isBn ? "bn-BD" : "en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
