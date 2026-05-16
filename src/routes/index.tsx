import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Hero } from "@/components/home/hero";
import { ModulesGrid } from "@/components/home/modules-grid";
import { NoticeColumn } from "@/components/home/notice-column";
import { RecentQuiz } from "@/components/home/recent-quiz";
import { RecentEvent } from "@/components/home/recent-event";
import { DailyHadith } from "@/components/home/daily-hadith";
import { RecentQA } from "@/components/home/recent-qa";
import { RecentLibrary } from "@/components/home/recent-library";
import { RecentVideos } from "@/components/home/recent-videos";
import { BlogStrip } from "@/components/home/blog-strip";
import { TopContributors } from "@/components/home/top-contributors";
import { QuizTop } from "@/components/home/quiz-top";
import { PwaInstall } from "@/components/home/pwa-install";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Halaqah — Home" },
      {
        name: "description",
        content: "Daily Islamic learning, community Q&A, quizzes, library, events, videos and blog.",
      },
      { property: "og:title", content: "Halaqah — Daily Islamic learning" },
      { property: "og:description", content: "Quiz, Q&A, Notices, Events, Library, Videos, Blog — all in one place." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <Hero />

      {/* Row 1: Modules (2/3) + Notice board (1/3) */}
      <section id="modules" className="px-4 lg:px-8 pb-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          <div className="lg:col-span-2">
            <ModulesGrid />
          </div>
          <div className="lg:col-span-1">
            <NoticeColumn />
          </div>
        </div>
      </section>

      {/* Row 2: Recent Quiz | Recent Event | Daily Hadith */}
      <section className="px-4 lg:px-8 pb-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <RecentQuiz />
          <RecentEvent />
          <DailyHadith />
        </div>
      </section>

      {/* Row 3: Q&A | Library | Videos (3 equal cols) */}
      <section className="px-4 lg:px-8 pb-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <RecentQA />
          <RecentLibrary />
          <RecentVideos />
        </div>
      </section>

      {/* Leaderboards: Q&A contributors + Quiz */}
      <section className="px-4 lg:px-8 pb-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <TopContributors />
          <QuizTop />
        </div>
      </section>

      {/* Row 4: Blog (4-col) */}
      <BlogStrip />

      <PwaInstall />
    </AppShell>
  );
}
