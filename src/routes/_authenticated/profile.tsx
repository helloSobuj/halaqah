import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Flame, Trophy, Award, Star } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Halaqah" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await signOut();
    toast.success(t("auth.loggedOut"));
    navigate({ to: "/" });
  };

  const initials = (profile?.display_name ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <div className="px-4 lg:px-8 py-6 lg:py-10 max-w-4xl mx-auto">
        <Card className="p-6 lg:p-8 shadow-elegant">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {profile?.display_name ?? user?.email}
              </h1>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {profile?.bio && <p className="mt-2 text-sm text-foreground">{profile.bio}</p>}
            </div>
          </div>

          {!isLoading && profile && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              <Stat icon={Trophy} label={t("profile.points")} value={profile.points} />
              <Stat icon={Flame} label={t("profile.streak")} value={profile.streak} />
              <Stat icon={Star} label={t("profile.level")} value={profile.level} />
              <Stat
                icon={Award}
                label={t("profile.badges")}
                value={Array.isArray(profile.badges) ? profile.badges.length : 0}
              />
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border flex justify-end">
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("auth.signOut")}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-4">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
