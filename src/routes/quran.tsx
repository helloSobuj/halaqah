import { createFileRoute } from "@tanstack/react-router";
import { ExternalFrame } from "@/components/external-frame";

export const Route = createFileRoute("/quran")({
  head: () => ({
    meta: [
      { title: "কুরআন — Halaqah" },
      { name: "description", content: "Read the Qur'an on Halaqah." },
    ],
  }),
  component: () => (
    <ExternalFrame title="কুরআন" src="https://quranmazid.com/1" />
  ),
});
