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
  Shield,
  MoreHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type NavItem = { to: string; labelKey: string; icon: React.ComponentType<{ className?: string }> };

const PRIMARY_NAV: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/quiz", labelKey: "nav.quiz", icon: BookOpen },
  { to: "/qa", labelKey: "nav.qa", icon: HelpCircle },
  { to: "/notices", labelKey: "nav.notices", icon: Bell },
  { to: "/events", labelKey: "nav.events", icon: Calendar },
  { to: "/library", labelKey: "nav.library", icon: Library },
  { to: "/videos", labelKey: "nav.videos", icon: Video },
  { to: "/blog", labelKey: "nav.blog", icon: PenSquare },
];

// Mobile bottom-tab nav (5 items max for native feel)
const MOBILE_TABS: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/quiz", labelKey: "nav.learn", icon: BookOpen },
  { to: "/qa", labelKey: "nav.community", icon: HelpCircle },
  { to: "/events", labelKey: "nav.events", icon: Calendar },
];

function Logo() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-soft">
        <span className="text-primary-foreground font-bold text-lg">ﺡ</span>
      </div>
      <span className="font-bold text-lg tracking-tight text-foreground">{t("app.name")}</span>
    </Link>
  );
}

function DesktopSidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
        {user ? (
          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/profile"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <User className="h-4.5 w-4.5" />
            {t("nav.profile")}
          </Link>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogIn className="h-4.5 w-4.5" />
            {t("auth.signIn")}
          </Link>
        )}
      </div>
    </aside>
  );
}

function TopBar() {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-2 px-4 lg:px-6 border-b border-border bg-background/85 backdrop-blur-md">
      {isMobile ? (
        <>
          <MobileMenu />
          <div className="flex-1 flex justify-center">
            <Logo />
          </div>
        </>
      ) : (
        <div className="flex-1" />
      )}
      <LanguageToggle />
      <ThemeToggle />
      {!isMobile && !user && (
        <Button asChild size="sm" variant="default">
          <Link to="/login">{t("auth.signIn")}</Link>
        </Button>
      )}
    </header>
  );
}

function MobileMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle asChild>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav className="px-3 py-3 space-y-0.5">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
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
              <User className="h-4.5 w-4.5" />
              {t("nav.profile")}
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <LogIn className="h-4.5 w-4.5" />
              {t("auth.signIn")}
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MobileBottomTabs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs: NavItem[] = [
    ...MOBILE_TABS,
    user
      ? { to: "/profile", labelKey: "nav.profile", icon: User }
      : { to: "/login", labelKey: "auth.signIn", icon: LogIn },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
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
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
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
  const isMobile = useIsMobile();
  return (
    <div className="min-h-screen flex w-full bg-background">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className={cn("flex-1", isMobile && "pb-20")}>{children}</main>
      </div>
      <MobileBottomTabs />
    </div>
  );
}
