import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/coming-soon";
export const Route = createFileRoute("/notices")({
  component: () => <ComingSoonPage titleKey="modules.notices.title" descKey="modules.notices.desc" />,
});
