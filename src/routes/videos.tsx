import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/coming-soon";
export const Route = createFileRoute("/videos")({
  component: () => <ComingSoonPage titleKey="modules.videos.title" descKey="modules.videos.desc" />,
});
