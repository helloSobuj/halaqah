import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

const RANK: Record<AppRole, number> = { admin: 1, moderator: 2, scholar: 3, user: 4 };

export function useUserRole() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = data ?? [];
  const highest =
    roles.length === 0
      ? null
      : roles.slice().sort((a, b) => RANK[a] - RANK[b])[0];

  const has = (r: AppRole) => roles.includes(r);
  const isAdmin = has("admin");
  const isModerator = isAdmin || has("moderator");
  const isScholar = isAdmin || has("scholar");
  const isStaff = isAdmin || has("moderator") || has("scholar");

  return { roles, highest, has, isAdmin, isModerator, isScholar, isStaff, isLoading };
}
