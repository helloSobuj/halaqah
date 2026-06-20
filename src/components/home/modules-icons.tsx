import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  HelpCircle,
  Bell,
  Calendar,
  Library,
  Video,
  PenSquare,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";

type Mod = {
  to: "/quiz" | "/qa" | "/notices" | "/events" | "/library" | "/videos" | "/blog";
  en: string;
  bn: string;
  icon: LucideIcon;
  tint: string;
};

const MODS: Mod[] = [
  { to: "/events", en: "Events", bn: "ইভেন্ট", icon: Calendar, tint: "from-sky-500/30 to-blue-500/10" },
  { to: "/quiz", en: "Quiz", bn: "কুইজ", icon: BookOpen, tint: "from-emerald-500/30 to-teal-500/10" },
  { to: "/qa", en: "Q&A", bn: "প্রশ্নোত্তর", icon: HelpCircle, tint: "from-amber-500/30 to-orange-500/10" },
  { to: "/library", en: "Library", bn: "লাইব্রেরি", icon: Library, tint: "from-violet-500/30 to-purple-500/10" },
  { to: "/videos", en: "Videos", bn: "ভিডিও", icon: Video, tint: "from-red-500/30 to-rose-500/10" },
  { to: "/notices", en: "Notices", bn: "নোটিশ", icon: Bell, tint: "from-rose-500/30 to-pink-500/10" },
  { to: "/blog", en: "Blog", bn: "ব্লগ", icon: PenSquare, tint: "from-teal-500/30 to-cyan-500/10" },
];

export function ModulesIcons() {
  const { lang } = useLanguage();
  const isBn = lang === "bn";

  return (
    <section className="px-4 lg:px-8 pb-10 max-w-7xl mx-auto">
      <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">
        {isBn ? "মডিউল ব্রাউজ করুন" : "Browse modules"}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {MODS.map((m, idx) => {
          const Icon = m.icon;
          const isLast = idx === MODS.length - 1;
          return (
            <Link
              key={m.to}
              to={m.to}
              className={`group ${isLast ? "col-span-2 md:col-span-1 lg:col-span-1" : ""}`}
            >
              <Card className="aspect-square p-3 flex flex-col items-center justify-center text-center border-border hover:border-primary/40 hover:shadow-elegant transition-all">
                <div
                  className={`h-12 w-12 lg:h-14 lg:w-14 rounded-2xl bg-gradient-to-br ${m.tint} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-foreground" />
                </div>
                <h3 className="font-semibold text-xs lg:text-sm text-foreground leading-tight">
                  {isBn ? m.bn : m.en}
                </h3>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
