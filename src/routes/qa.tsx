import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/coming-soon";
export const Route = createFileRoute("/qa")({
  component: () => <ComingSoonPage titleKey="modules.qa.title" descKey="modules.qa.desc" />,
});
