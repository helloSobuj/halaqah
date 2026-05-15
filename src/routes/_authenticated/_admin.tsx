import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Users, Bell, Calendar, PenSquare, HelpCircle, BookOpen, Library, Video, ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) throw redirect({ to: "/login" });
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    if (error) throw redirect({ to: "/" });
    const roles = (data ?? []).map((r) => r.role);
    const ok = roles.includes("admin") || roles.includes("moderator") || roles.includes("scholar");
    if (!ok) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Admin — Halaqah" }] }),
  component: AdminLayout,
});

const SECTIONS = [
  { to: "/admin", labelKey: "admin.dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", labelKey: "admin.users", icon: Users },
  { to: "/admin/notices", labelKey: "nav.notices", icon: Bell, soon: true },
  { to: "/admin/events", labelKey: "nav.events", icon: Calendar, soon: true },
  { to: "/admin/blog", labelKey: "nav.blog", icon: PenSquare, soon: true },
  { to: "/admin/qa", labelKey: "nav.qa", icon: HelpCircle, soon: true },
  { to: "/admin/quiz", labelKey: "nav.quiz", icon: BookOpen, soon: true },
  { to: "/admin/library", labelKey: "nav.library", icon: Library, soon: true },
  { to: "/admin/videos", labelKey: "nav.videos", icon: Video, soon: true },
] as const;

function AdminLayout() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t("admin.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("admin.subtitle")}</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("admin.backToApp")}
          </Link>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const active = "exact" in s && s.exact ? pathname === s.to : pathname.startsWith(s.to);
                const disabled = "soon" in s && s.soon;
                const className = cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  active ? "bg-primary/10 text-primary" : "text-foreground/75 hover:bg-accent hover:text-foreground",
                  disabled && "opacity-50 pointer-events-none",
                );
                return disabled ? (
                  <span key={s.to} className={className}>
                    <Icon className="h-4 w-4" />
                    {t(s.labelKey)}
                  </span>
                ) : (
                  <Link key={s.to} to={s.to} className={className}>
                    <Icon className="h-4 w-4" />
                    {t(s.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section>
            <Outlet />
          </section>
        </div>
      </div>
    </AppShell>
  );
}

