import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/coming-soon";
export const Route = createFileRoute("/library")({
  component: () => <ComingSoonPage titleKey="modules.library.title" descKey="modules.library.desc" />,
});
