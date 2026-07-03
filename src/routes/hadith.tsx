import { createFileRoute } from "@tanstack/react-router";
import { ExternalFrame } from "@/components/external-frame";

export const Route = createFileRoute("/hadith")({
  head: () => ({
    meta: [
      { title: "হাদিস — Halaqah" },
      { name: "description", content: "Read Hadith on Halaqah." },
    ],
  }),
  component: () => (
    <ExternalFrame title="হাদিস" src="https://ihadis.com/" />
  ),
});
