import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/coming-soon";
export const Route = createFileRoute("/events")({
  component: () => <ComingSoonPage titleKey="modules.events.title" descKey="modules.events.desc" />,
});
