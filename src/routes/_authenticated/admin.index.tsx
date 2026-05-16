import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users, Bell, Calendar, PenSquare, HelpCircle, BookOpen, Library, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const CARDS = [
  { to: "/admin/users", titleKey: "admin.users", descKey: "admin.usersDesc", icon: Users },
  { to: "/admin/notices", titleKey: "nav.notices", descKey: "modules.notices.desc", icon: Bell, soon: true },
  { to: "/admin/events", titleKey: "nav.events", descKey: "modules.events.desc", icon: Calendar },
  { to: "/admin/blog", titleKey: "nav.blog", descKey: "modules.blog.desc", icon: PenSquare, soon: true },
  { to: "/admin/qa", titleKey: "nav.qa", descKey: "modules.qa.desc", icon: HelpCircle, soon: true },
  { to: "/admin/quiz", titleKey: "nav.quiz", descKey: "modules.quiz.desc", icon: BookOpen },
  { to: "/admin/library", titleKey: "nav.library", descKey: "modules.library.desc", icon: Library },
  { to: "/admin/videos", titleKey: "nav.videos", descKey: "modules.videos.desc", icon: Video },
] as const;

function AdminDashboard() {
  const { t } = useTranslation();
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const inner = (
          <Card className="p-5 h-full border-border hover:border-primary/40 hover:shadow-elegant transition-all">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{t(c.titleKey)}</h3>
                  {"soon" in c && c.soon && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t("common.comingSoon")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t(c.descKey)}</p>
              </div>
            </div>
          </Card>
        );
        return "soon" in c && c.soon ? (
          <div key={c.to} className="opacity-70 pointer-events-none">
            {inner}
          </div>
        ) : (
          <Link key={c.to} to={c.to}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
