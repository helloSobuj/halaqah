import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  BookOpen, HelpCircle, Bell, Calendar, Library, Video, PenSquare,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";

type Module = {
  to: "/quiz" | "/qa" | "/notices" | "/events" | "/library" | "/videos" | "/blog";
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  color: string;
};

const MODULES: Module[] = [
  { to: "/quiz", titleKey: "modules.quiz.title", descKey: "modules.quiz.desc", icon: BookOpen, color: "from-emerald-500/25 to-teal-500/10" },
  { to: "/qa", titleKey: "modules.qa.title", descKey: "modules.qa.desc", icon: HelpCircle, color: "from-amber-500/25 to-orange-500/10" },
  { to: "/notices", titleKey: "modules.notices.title", descKey: "modules.notices.desc", icon: Bell, color: "from-rose-500/25 to-pink-500/10" },
  { to: "/events", titleKey: "modules.events.title", descKey: "modules.events.desc", icon: Calendar, color: "from-sky-500/25 to-blue-500/10" },
  { to: "/library", titleKey: "modules.library.title", descKey: "modules.library.desc", icon: Library, color: "from-violet-500/25 to-purple-500/10" },
  { to: "/videos", titleKey: "modules.videos.title", descKey: "modules.videos.desc", icon: Video, color: "from-red-500/25 to-rose-500/10" },
  { to: "/blog", titleKey: "modules.blog.title", descKey: "modules.blog.desc", icon: PenSquare, color: "from-teal-500/25 to-cyan-500/10" },
];

export function ModulesGrid() {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-lg lg:text-xl font-bold text-foreground mb-4">{t("home.modules")}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.to} to={m.to} className="group">
              <Card className="p-4 h-full border-border hover:border-primary/40 hover:shadow-elegant transition-all">
                <div
                  className={`h-10 w-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
                >
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-semibold text-sm text-foreground leading-tight">{t(m.titleKey)}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t(m.descKey)}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
