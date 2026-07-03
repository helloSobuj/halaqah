import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  BookOpen,
  HelpCircle,
  Bell,
  Calendar,
  Library,
  Video,
  PenSquare,
  User,
  LogIn,
  ChevronDown,
  Menu,
  Shield,
  Trophy,
  BookMarked,
  ScrollText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NotificationsBell } from "@/components/notifications-bell";
import { SiteFooter } from "@/components/site-footer";

import { cn } from "@/lib/utils";

import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type NavItem = { to: string; labelKey: string; icon: React.ComponentType<{ className?: string }> };

function useCollapseOnScroll(threshold = 8) {
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < threshold) return;
      setCollapsed(y > lastY && y > 64);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return collapsed;
}

// 5 primary items shown directly in the top bar
const TOP_NAV: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/quiz", labelKey: "nav.quiz", icon: BookOpen },
  { to: "/qa", labelKey: "nav.qa", icon: HelpCircle },
  { to: "/notices", labelKey: "nav.notices", icon: Bell },
  { to: "/events", labelKey: "nav.events", icon: Calendar },
];

// Extras live under "More"
const MORE_NAV: NavItem[] = [
  { to: "/quran", labelKey: "nav.quran", icon: BookMarked },
  { to: "/hadith", labelKey: "nav.hadith", icon: ScrollText },
  { to: "/tournaments", labelKey: "nav.tournaments", icon: Trophy },
  { to: "/library", labelKey: "nav.library", icon: Library },
  { to: "/videos", labelKey: "nav.videos", icon: Video },
  { to: "/blog", labelKey: "nav.blog", icon: PenSquare },
];

const ALL_NAV = [...TOP_NAV, ...MORE_NAV];

import halaqahLogo from "@/assets/halaqah-logo.png";

function Logo() {
  return (
    <Link to="/" className="flex items-center" aria-label="Halaqah">
      <img src={halaqahLogo} alt="Halaqah" className="h-10 w-auto" />
    </Link>
  );
}

function NavLinkPill({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useTranslation();
  return (
    <Link
      to={item.to}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground/75 hover:text-foreground hover:bg-accent",
      )}
    >
      <span suppressHydrationWarning>{t(item.labelKey)}</span>
    </Link>
  );
}

function DesktopTopBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isStaff } = useUserRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto h-16 flex items-center gap-3 px-6">
        <Logo />
        <nav className="flex-1 flex justify-center items-center gap-1">
          {TOP_NAV.map((item) => (
            <NavLinkPill key={item.to} item={item} active={isActive(item.to)} />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-1 transition-colors",
                  MORE_NAV.some((m) => isActive(m.to))
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/75 hover:text-foreground hover:bg-accent",
                )}
              >
                {t("nav.more")} <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to} className="flex items-center gap-2 cursor-pointer">
                      <Icon className="h-4 w-4" /> {t(item.labelKey)}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              {isStaff && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                    <Shield className="h-4 w-4" /> {t("nav.admin")}
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
          <NotificationsBell />
          {user ? (
            <Button asChild size="sm" variant="ghost" className="rounded-full">
              <Link to="/profile">
                <User className="h-4 w-4" /> {t("nav.profile")}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="rounded-full shadow-soft">
              <Link to="/login">{t("auth.signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileTopBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-2 px-4 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <Logo />
      <div className="flex-1" />
      <LanguageToggle />
      <ThemeToggle />
      <NotificationsBell />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Menu" className="rounded-full">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle asChild>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <nav className="px-3 py-3 space-y-0.5">
            {ALL_NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-border" />
            {user ? (
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <User className="h-4.5 w-4.5" /> {t("nav.profile")}
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <LogIn className="h-4.5 w-4.5" /> {t("auth.signIn")}
              </Link>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function MobileBottomTabs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs: NavItem[] = [
    { to: "/", labelKey: "nav.home", icon: Home },
    { to: "/quiz", labelKey: "nav.quiz", icon: BookOpen },
    { to: "/qa", labelKey: "nav.qa", icon: HelpCircle },
    { to: "/events", labelKey: "nav.events", icon: Calendar },
    user
      ? { to: "/profile", labelKey: "nav.profile", icon: User }
      : { to: "/login", labelKey: "auth.signIn", icon: LogIn },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-border/60 bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-full">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/" ? pathname === "/" : pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110 transition-transform")} />
              <span className="font-medium leading-none">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <div className="md:hidden contents">
        <MobileTopBar />
      </div>
      <div className="hidden md:contents">
        <DesktopTopBar />
      </div>
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileBottomTabs />
    </div>
  );
}
