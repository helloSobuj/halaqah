import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { listMyReminders, markReminderRead } from "@/lib/reminder.functions";
import { listUnreadNotices, markNoticeRead } from "@/lib/notices.functions";
import { useAuth } from "@/hooks/use-auth";

export function NotificationsBell() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyReminders);
  const markFn = useServerFn(markReminderRead);
  const noticesFn = useServerFn(listUnreadNotices);
  const markNoticeFn = useServerFn(markNoticeRead);

  const reminders = useQuery({
    queryKey: ["my-reminders"],
    queryFn: () => listFn(),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const unreadNotices = useQuery({
    queryKey: ["unread-notices"],
    queryFn: () => noticesFn(),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const markMut = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-reminders"] }),
  });

  const markNoticeMut = useMutation({
    mutationFn: (id: string) => markNoticeFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unread-notices"] }),
  });

  if (!user) return null;
  const reminderItems = reminders.data ?? [];
  const noticeItems = (unreadNotices.data ?? []) as Array<{
    id: string; title_en: string; title_bn: string;
    priority: "normal" | "important" | "urgent"; published_at: string | null;
  }>;
  const unreadReminders = reminderItems.filter((r: any) => r.sent_at && !r.read_at).length;
  const totalUnread = unreadReminders + noticeItems.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="notifications" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {noticeItems.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5" /> {t("nav.notices", { defaultValue: "Notices" })}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-60 overflow-y-auto">
              {noticeItems.map((n) => {
                const title = isBn && n.title_bn ? n.title_bn : n.title_en;
                return (
                  <Link
                    key={n.id}
                    to="/notices"
                    onClick={() => markNoticeMut.mutate(n.id)}
                    className="block px-3 py-2 text-sm hover:bg-muted bg-primary/5"
                  >
                    <div className="font-medium text-foreground line-clamp-1">{title}</div>
                    <div className="text-xs text-muted-foreground">
                      {n.priority === "urgent" ? "Urgent · " : n.priority === "important" ? "Important · " : ""}
                      {n.published_at && new Date(n.published_at).toLocaleDateString(isBn ? "bn-BD" : "en-US")}
                    </div>
                  </Link>
                );
              })}
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel>{t("reminders.title", { defaultValue: "Reminders" })}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {reminderItems.length === 0 && noticeItems.length === 0 && (
          <div className="px-3 py-6 text-sm text-muted-foreground text-center">
            {t("reminders.empty", { defaultValue: "Nothing new." })}
          </div>
        )}
        <div className="max-h-60 overflow-y-auto">
          {reminderItems.map((r: any) => {
            const due = new Date(r.remind_at).getTime() <= Date.now();
            const title = r.quizzes
              ? isBn ? r.quizzes.title_bn : r.quizzes.title_en
              : r.tournaments
                ? isBn ? r.tournaments.name_bn : r.tournaments.name_en
                : t("reminders.title", { defaultValue: "Reminder" });
            const href = r.quiz_id
              ? `/quiz/play/${r.quiz_id}`
              : r.tournament_id
                ? `/tournaments/${r.tournament_id}`
                : "/";
            return (
              <Link
                key={r.id}
                to={href}
                onClick={() => !r.read_at && markMut.mutate(r.id)}
                className={`block px-3 py-2 text-sm hover:bg-muted ${!r.read_at && due ? "bg-primary/5" : ""}`}
              >
                <div className="font-medium text-foreground line-clamp-1">{title}</div>
                <div className="text-xs text-muted-foreground">
                  {due
                    ? t("reminders.dueNow", { defaultValue: "Starting now" })
                    : new Date(r.remind_at).toLocaleString(isBn ? "bn-BD" : "en-US")}
                </div>
              </Link>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
