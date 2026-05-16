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
            <Link to="/" className="flex items-center" aria-label="Halaqah">
              <img src={halaqahLogo} alt="Halaqah" className="h-9 w-auto" />
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              {isBn
                ? "শিখুন, শেয়ার করুন এবং একজন উত্তম মুসলিম হিসেবে বেড়ে উঠুন।"
                : "Learn, share, and grow together as a community."}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {[...COL_LEARN, ...COL_COMMUNITY, ...COL_MEDIA].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
              >
                {t(l.labelKey)}
              </Link>
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
