import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Flame, Trophy, Award, Star, Camera, Bookmark, Activity, Eye, MessageSquare, ThumbsUp, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyAttempts } from "@/lib/quiz.functions";
import { listMyQA, getMyBadges } from "@/lib/qa.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="identity">{t("profile.tabs.identity")}</TabsTrigger>
            <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
            <TabsTrigger value="speaking">Speaking</TabsTrigger>
            <TabsTrigger value="saved">{t("profile.tabs.saved")}</TabsTrigger>
            <TabsTrigger value="activity">{t("profile.tabs.activity")}</TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            {profile && <IdentityForm profile={profile} userId={user!.id} />}
          </TabsContent>

          <TabsContent value="qa">
            <QAPanel />
          </TabsContent>

          <TabsContent value="speaking">
            <MySpeakingPanel />
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
            <ActivityList />
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

function ActivityList() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const fn = useServerFn(listMyAttempts);
  const q = useQuery({ queryKey: ["my-attempts"], queryFn: () => fn() });

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!q.data || q.data.length === 0) {
    return (
      <Card className="p-8 text-center space-y-3">
        <Activity className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          {t("quiz.noAttempts", { defaultValue: "You haven't taken any quizzes yet." })}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/quiz">{t("quiz.moreQuizzes", { defaultValue: "Browse quizzes" })}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {q.data.map((a) => {
        const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
        const quiz = (a as { quizzes?: { title_en: string; title_bn: string } }).quizzes;
        return (
          <Card key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground truncate">
                {isBn ? quiz?.title_bn : quiz?.title_en}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {pct}% • {a.score}/{a.total} • +{a.points_awarded} pts •{" "}
                {Math.floor(a.time_taken_seconds / 60)}m {a.time_taken_seconds % 60}s
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {new Date(a.completed_at).toLocaleString(isBn ? "bn-BD" : "en-US")}
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/quiz/review/$attemptId" params={{ attemptId: a.id }}>
                <Eye className="h-3.5 w-3.5 mr-1" /> {t("quiz.review", { defaultValue: "Review" })}
              </Link>
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

const REP_REASON_LABELS: Record<string, string> = {
  q_upvoted: "Question upvoted",
  a_upvoted: "Answer upvoted",
  answer_accepted: "Answer accepted",
  accepted_pick: "Picked an accepted answer",
  scholar_endorsed: "Scholar endorsed",
  downvoted: "Post downvoted",
  downvote_cost: "Cast downvote",
  daily_quest_bonus: "Daily quest bonus",
  endorse_removed: "Endorsement removed",
  accept_removed: "Acceptance removed",
};

const BADGE_META: Record<string, { label: string; desc: string; emoji: string }> = {
  curious: { label: "Curious", desc: "Asked your first question", emoji: "🌱" },
  helpful: { label: "Helpful", desc: "First accepted answer", emoji: "✨" },
  teacher: { label: "Teacher", desc: "10 accepted answers", emoji: "🎓" },
  scholars_pick: { label: "Scholar's Pick", desc: "Endorsed by a scholar", emoji: "🌟" },
  streak_sage: { label: "Streak Sage", desc: "7-day answer streak", emoji: "🔥" },
};

function QAPanel() {
  const fn = useServerFn(listMyQA);
  const badgesFn = useServerFn(getMyBadges);
  const q = useQuery({ queryKey: ["my-qa"], queryFn: () => fn() });
  const badgesQ = useQuery({ queryKey: ["my-qa-badges"], queryFn: () => badgesFn() });

  if (q.isLoading) return <Skeleton className="h-60 w-full" />;
  if (!q.data) return null;
  const data = q.data;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={Sparkles} label="Reputation" value={data.reputation} />
          <Stat icon={Flame} label="Answer streak" value={data.answerStreak} />
          <Stat icon={MessageSquare} label="Questions" value={data.questions.length} />
          <Stat icon={CheckCircle2} label="Answers" value={data.answers.length} />
        </div>
      </Card>

      {badgesQ.data && badgesQ.data.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Q&amp;A badges
          </h3>
          <div className="flex flex-wrap gap-2">
            {badgesQ.data.map((b: any) => {
              const meta = BADGE_META[b.code] ?? { label: b.code, desc: "", emoji: "🏅" };
              return (
                <div
                  key={b.code}
                  className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs"
                  title={meta.desc}
                >
                  <span className="text-base leading-none">{meta.emoji}</span>
                  <span className="font-medium">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Recent questions</h3>
        {data.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't asked any questions yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.questions.map((qq: any) => (
              <li key={qq.id} className="flex items-center justify-between gap-3">
                <Link
                  to="/qa/$questionId"
                  params={{ questionId: qq.id }}
                  className="text-sm hover:underline truncate flex-1 min-w-0"
                >
                  {qq.title}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{qq.vote_score}</span>
                  <span>{qq.answer_count} ans</span>
                  {qq.accepted_answer_id && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Recent answers</h3>
        {data.answers.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't answered any questions yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.answers.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <Link
                  to="/qa/$questionId"
                  params={{ questionId: a.question_id }}
                  className="text-sm hover:underline truncate flex-1 min-w-0"
                >
                  {a.question_title ?? "Question"}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{a.vote_score}</span>
                  {a.is_accepted && <Badge variant="outline" className="text-emerald-600 border-emerald-600">accepted</Badge>}
                  {a.is_scholar_endorsed && <Badge variant="outline" className="text-amber-600 border-amber-600">endorsed</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.recentRep && data.recentRep.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Reputation activity</h3>
          <ul className="space-y-1.5 text-sm">
            {data.recentRep.map((e: any, i: number) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-muted-foreground">{REP_REASON_LABELS[e.reason] ?? e.reason}</span>
                <span className={e.delta > 0 ? "text-emerald-600 font-medium tabular-nums" : "text-rose-600 font-medium tabular-nums"}>
                  {e.delta > 0 ? "+" : ""}{e.delta}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function MySpeakingPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMySpeakerEntries);
  const delFn = useServerFn(deleteMySpeakerEntry);
  const { data, isLoading } = useQuery({
    queryKey: ["my-speaker-entries"],
    queryFn: () => listFn(),
  });
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["my-speaker-entries"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data?.length) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        You haven't booked any speaking slots yet.
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {data.map((s) => {
        const ev = (s as { event?: { slug: string; title_en: string; starts_at: string } | null }).event;
        const evStart = ev ? new Date(ev.starts_at) : null;
        const slotStart = evStart ? new Date(evStart.getTime() + s.start_minute * 60_000) : null;
        const slotEnd = evStart ? new Date(evStart.getTime() + (s.start_minute + s.duration_minutes) * 60_000) : null;
        const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        return (
          <Card key={s.id} className="p-4 flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {ev ? (
                  <Link to="/events/$slug" params={{ slug: ev.slug }} className="hover:underline">
                    {ev.title_en}
                  </Link>
                ) : (
                  "Event"
                )}
              </div>
              <p className="text-sm mt-1">
                <span className="font-medium">{s.name}</span> — {s.topic}
              </p>
              {s.is_for_child && s.child_name && (
                <p className="text-xs text-muted-foreground">On behalf of {s.child_name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {slotStart && slotEnd ? `${t(slotStart)} – ${t(slotEnd)}` : ""} · {s.duration_minutes} min
              </p>
              {ev && (
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link to="/events/$slug" params={{ slug: ev.slug }}>Edit on event page</Link>
                </Button>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDeleteId(s.id)}
              title="Remove"
            >
              <span className="sr-only">Remove</span>
              ✕
            </Button>
          </Card>
        );
      })}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteId(null)}>
          <Card className="p-5 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium">Remove this booking?</p>
            <p className="text-sm text-muted-foreground">The time block will be freed up.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button onClick={() => deleteId && delMut.mutate(deleteId)}>Remove</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


