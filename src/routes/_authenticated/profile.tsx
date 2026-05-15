import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Flame, Trophy, Award, Star, Camera, Bookmark, Activity, History, Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyAttempts } from "@/lib/quiz.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Halaqah" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { highest, isStaff } = useUserRole();

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
      <div className="px-4 lg:px-8 py-6 lg:py-10 max-w-4xl mx-auto space-y-6">
        <Card className="p-6 lg:p-8 shadow-elegant">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <AvatarUpload
              userId={user?.id}
              avatarUrl={profile?.avatar_url ?? null}
              initials={initials}
              onUploaded={() => qc.invalidateQueries({ queryKey: ["profile", user?.id] })}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {profile?.display_name ?? user?.email}
                </h1>
                {highest && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5">
                    {t(`admin.role.${highest}`)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {profile?.bio && <p className="mt-2 text-sm text-foreground">{profile.bio}</p>}
            </div>
            <div className="flex gap-2">
              {isStaff && (
                <Button variant="outline" onClick={() => navigate({ to: "/admin" })}>
                  {t("nav.admin")}
                </Button>
              )}
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                {t("auth.signOut")}
              </Button>
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
        </Card>

        <Tabs defaultValue="identity">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="identity">{t("profile.tabs.identity")}</TabsTrigger>
            <TabsTrigger value="saved">{t("profile.tabs.saved")}</TabsTrigger>
            <TabsTrigger value="activity">{t("profile.tabs.activity")}</TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            {profile && <IdentityForm profile={profile} userId={user!.id} />}
          </TabsContent>

          <TabsContent value="saved">
            <Card className="p-6 text-center space-y-3">
              <Bookmark className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">{t("profile.bookmarksDesc", { defaultValue: "Your bookmarked quizzes." })}</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/quiz/bookmarks">{t("quiz.bookmarks", { defaultValue: "Open bookmarks" })}</Link>
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="p-6 text-center space-y-3">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">{t("profile.activityDesc", { defaultValue: "Your quiz attempts and scores." })}</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/quiz/my-attempts"><History className="h-4 w-4 mr-1.5" />{t("quiz.myAttempts", { defaultValue: "My attempts" })}</Link>
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
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

function AvatarUpload({
  userId,
  avatarUrl,
  initials,
  onUploaded,
}: {
  userId: string | undefined;
  avatarUrl: string | null;
  initials: string;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!userId) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Max file size 4MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: pub.publicUrl })
        .eq("id", userId);
      if (updErr) throw updErr;
      toast.success("Avatar updated");
      onUploaded();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <Avatar className="h-24 w-24">
        <AvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-soft flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
        aria-label="Change avatar"
      >
        <Camera className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

type ProfileRow = {
  display_name: string | null;
  bio: string | null;
  location: string | null;
  gender: string | null;
  language: string;
};

function IdentityForm({ profile, userId }: { profile: ProfileRow; userId: string }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = React.useState({
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    gender: profile.gender ?? "",
    language: profile.language ?? "en",
  });

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name.trim() || null,
          bio: form.bio.trim() || null,
          location: form.location.trim() || null,
          gender: form.gender || null,
          language: form.language,
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("profile.saved"));
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      if (form.language !== i18n.language) i18n.changeLanguage(form.language);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-6">
      <form
        className="grid sm:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="display_name">{t("auth.displayName")}</Label>
          <Input
            id="display_name"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            maxLength={80}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bio">{t("profile.bio")}</Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            maxLength={300}
          />
        </div>
        <div>
          <Label htmlFor="location">{t("profile.location")}</Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            maxLength={80}
          />
        </div>
        <div>
          <Label>{t("profile.gender")}</Label>
          <Select value={form.gender || "unset"} onValueChange={(v) => setForm({ ...form, gender: v === "unset" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">—</SelectItem>
              <SelectItem value="male">{t("profile.male")}</SelectItem>
              <SelectItem value="female">{t("profile.female")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("common.language")}</Label>
          <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="bn">বাংলা</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 flex justify-end pt-2">
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
