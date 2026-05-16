import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles, Moon, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { formatHijri } from "@/lib/hijri";

export function Hero() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const now = new Date();
  const hijri = mounted ? formatHijri(now, lang) : "";
  const gregorian = mounted
    ? now.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 65%), radial-gradient(50% 50% at 85% 30%, color-mix(in oklab, var(--accent) 35%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -top-32 right-1/3 h-72 w-72 rounded-full blur-3xl opacity-40 animate-pulse"
        style={{ background: "color-mix(in oklab, var(--primary) 40%, transparent)" }}
      />
      <div className="px-4 lg:px-8 pt-10 lg:pt-16 pb-8 lg:pb-12 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-5">
          <Sparkles className="h-3.5 w-3.5" />
          {t("app.tagline")}
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-foreground">
          {t("home.hero")}
        </h1>
        <p className="mt-4 lg:mt-5 text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("home.heroSub")}
        </p>

        {mounted && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur border border-border text-xs font-medium text-foreground">
              <Moon className="h-3.5 w-3.5 text-primary" />
              {hijri}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur border border-border text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {gregorian}
            </span>
          </div>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {!user && (
            <Button asChild size="lg" className="shadow-elegant">
              <Link to="/signup">
                {t("home.getStarted")} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant={user ? "default" : "outline"}>
            <a href="#modules">{t("home.explore")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
