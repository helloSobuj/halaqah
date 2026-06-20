import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { HeroEvents } from "@/components/home/hero-events";
import { ModulesIcons } from "@/components/home/modules-icons";
import { LibraryRow } from "@/components/home/library-row";
import { VideosRow } from "@/components/home/videos-row";
import { EventsRow } from "@/components/home/events-row";
import { QaRow } from "@/components/home/qa-row";
import { QuizRow } from "@/components/home/quiz-row";
import { BlogStrip } from "@/components/home/blog-strip";
import { CtaSection } from "@/components/home/cta-section";
import { PwaInstall } from "@/components/home/pwa-install";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Halaqah — Home" },
      {
        name: "description",
        content: "Community events, daily Islamic learning, Q&A, quizzes, library, videos and blog.",
      },
      { property: "og:title", content: "Halaqah — Community events & daily Islamic learning" },
      { property: "og:description", content: "Events, Quiz, Q&A, Notices, Library, Videos, Blog — all in one place." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <HeroEvents />
      <ModulesIcons />
      <LibraryRow />
      <VideosRow />
      <EventsRow />
      <QaRow />
      <QuizRow />
      <BlogStrip />
      <CtaSection />
      <PwaInstall />
    </AppShell>
  );
}
