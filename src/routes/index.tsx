import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  HelpCircle,
  Bell,
  Calendar,
  Library,
  Video,
  PenSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { listPosts } from "@/lib/blog.functions";
import { listNotices } from "@/lib/notices.functions";
import { PostCard, type BlogPostCardData } from "@/components/blog/post-card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Halaqah — Home" },
      {
        name: "description",
        content: "Daily Islamic learning, community Q&A, quizzes, library, and events.",
      },
    ],
  }),
  component: Index,
});

const MODULES = [
  { to: "/quiz", titleKey: "modules.quiz.title", descKey: "modules.quiz.desc", icon: BookOpen, color: "from-emerald-500/20 to-teal-500/10" },
  { to: "/qa", titleKey: "modules.qa.title", descKey: "modules.qa.desc", icon: HelpCircle, color: "from-amber-500/20 to-orange-500/10" },
  { to: "/notices", titleKey: "modules.notices.title", descKey: "modules.notices.desc", icon: Bell, color: "from-rose-500/20 to-pink-500/10" },
  { to: "/events", titleKey: "modules.events.title", descKey: "modules.events.desc", icon: Calendar, color: "from-sky-500/20 to-blue-500/10" },
  { to: "/library", titleKey: "modules.library.title", descKey: "modules.library.desc", icon: Library, color: "from-violet-500/20 to-purple-500/10" },
  { to: "/videos", titleKey: "modules.videos.title", descKey: "modules.videos.desc", icon: Video, color: "from-red-500/20 to-rose-500/10" },
  { to: "/blog", titleKey: "modules.blog.title", descKey: "modules.blog.desc", icon: PenSquare, color: "from-teal-500/20 to-cyan-500/10" },
] as const;

function Hero() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="px-4 lg:px-8 pt-10 lg:pt-20 pb-10 lg:pb-16 max-w-5xl mx-auto text-center">
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

function BlogStrip({ title, sortBy }: { title: string; sortBy: "recent" | "popular" }) {
  const fn = useServerFn(listPosts);
  const { data } = useQuery({
    queryKey: ["home-blog", sortBy],
    queryFn: () => fn({ data: { sortBy, pageSize: 3, page: 1 } }) as unknown as Promise<{ posts: BlogPostCardData[]; total: number }>,
  });
  const posts = data?.posts ?? [];
  if (!posts.length) return null;
  return (
    <section className="px-4 lg:px-8 pb-12 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl lg:text-2xl font-bold text-foreground">{title}</h2>
        <Link to="/blog" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </section>
  );
}

type NoticeRow = {
  id: string;
  title_en: string;
  priority: "normal" | "important" | "urgent";
  is_pinned: boolean;
  published_at: string | null;
};

function NoticeBoard() {
  const fn = useServerFn(listNotices);
  const { data } = useQuery({
    queryKey: ["notices-public", "home"],
    queryFn: () => fn({ data: { limit: 3 } }) as unknown as Promise<NoticeRow[]>,
  });
  const items = data ?? [];
  return (
    <section className="px-4 lg:px-8 pb-12 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notice board
        </h2>
        <Link to="/notices" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {!items.length ? (
        <Card className="p-6 text-sm text-muted-foreground text-center border-dashed">
          No notices yet.
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((n) => (
            <Link key={n.id} to="/notices" className="block">
              <Card className="p-4 border-border hover:border-primary/40 hover:shadow-elegant transition-all">
                <div className="flex items-start gap-3">
                  {n.is_pinned && <Pin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{n.title_en}</p>
                      {n.priority === "urgent" && <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-0 text-[10px]">Urgent</Badge>}
                      {n.priority === "important" && <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0 text-[10px]">Important</Badge>}
                    </div>
                    {n.published_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(n.published_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
  const { t } = useTranslation();
  return (
    <AppShell>
      <Hero />
      <section id="modules" className="px-4 lg:px-8 pb-12 max-w-6xl mx-auto">
        <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-5">{t("home.modules")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.to} to={m.to} className="group">
                <Card className="p-5 h-full border-border hover:border-primary/40 hover:shadow-elegant transition-all">
                  <div
                    className={`h-12 w-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">{t(m.titleKey)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(m.descKey)}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
      <BlogStrip title="Latest from the blog" sortBy="recent" />
      <BlogStrip title="Popular posts" sortBy="popular" />
    </AppShell>
  );
}
