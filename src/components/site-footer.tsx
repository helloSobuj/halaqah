import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const COL_LEARN = [
  { to: "/quiz", labelKey: "nav.quiz" },
  { to: "/qa", labelKey: "nav.qa" },
  { to: "/library", labelKey: "nav.library" },
] as const;

const COL_COMMUNITY = [
  { to: "/notices", labelKey: "nav.notices" },
  { to: "/events", labelKey: "nav.events" },
  { to: "/blog", labelKey: "nav.blog" },
] as const;

const COL_MEDIA = [
  { to: "/videos", labelKey: "nav.videos" },
  { to: "/tournaments", labelKey: "nav.tournaments" },
] as const;

export function SiteFooter() {
  const { t } = useTranslation();
  const isBn = useLanguage().lang === "bn";
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-base leading-none">ﺡ</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-sm text-foreground">{t("app.name")}</span>
                <span className="text-[11px] text-muted-foreground">{t("app.tagline")}</span>
              </div>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              {isBn
                ? "শিখুন, শেয়ার করুন এবং একজন উত্তম মুসলিম হিসেবে বেড়ে উঠুন।"
                : "Learn, share, and grow together as a community."}
            </p>
          </div>

          <nav className="grid grid-cols-3 gap-6 text-sm">
            {[
              { heading: isBn ? "শেখা" : "Learn", items: COL_LEARN },
              { heading: isBn ? "কমিউনিটি" : "Community", items: COL_COMMUNITY },
              { heading: isBn ? "মিডিয়া" : "Media", items: COL_MEDIA },
            ].map((col) => (
              <div key={col.heading} className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{col.heading}</h4>
                {col.items.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t(l.labelKey)}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-6 pt-5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p suppressHydrationWarning>© {year} {t("app.name")}. {isBn ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}</p>
          <p className="inline-flex items-center gap-1">
            {isBn ? "ডিজাইন ও ডেভেলপ করেছেন" : "Designed & developed by"}{" "}
            <a
              href="https://sobujhossen.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Sobuj Hossen
            </a>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
