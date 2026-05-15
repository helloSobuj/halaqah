import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/coming-soon";
export const Route = createFileRoute("/blog")({
  component: () => <ComingSoonPage titleKey="modules.blog.title" descKey="modules.blog.desc" />,
});
