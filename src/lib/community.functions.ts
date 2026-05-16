import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listTopContributors = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ limit: z.number().min(1).max(20).default(5) }).parse(i ?? {}))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url, qa_reputation")
      .order("qa_reputation", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((r) => (r.qa_reputation ?? 0) > 0);
  });
