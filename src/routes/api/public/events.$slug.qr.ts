import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/events/$slug/qr")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { data: e } = await supabaseAdmin
          .from("events")
          .select("id,slug,is_published")
          .eq("slug", params.slug)
          .maybeSingle();

        if (!e || !e.is_published) {
          return new Response("Not found", { status: 404 });
        }

        try {
          await supabaseAdmin
            .from("event_shares")
            .insert({ event_id: e.id, channel: "qr_scan" });
        } catch {
          // best-effort analytics
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: `/events/${e.slug}`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
