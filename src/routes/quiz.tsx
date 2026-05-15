import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/coming-soon";
export const Route = createFileRoute("/quiz")({
  component: () => <ComingSoonPage titleKey="modules.quiz.title" descKey="modules.quiz.desc" />,
});
