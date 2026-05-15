import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";

export function NotificationsBell() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyReminders);
  const markFn = useServerFn(markReminderRead);

  const reminders = useQuery({
    queryKey: ["my-reminders"],
    queryFn: () => listFn(),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const markMut = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-reminders"] }),
  });

  if (!user) return null;
  const items = reminders.data ?? [];
  const unread = items.filter((r: any) => r.sent_at && !r.read_at).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>{t("reminders.title", { defaultValue: "Reminders" })}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="px-3 py-6 text-sm text-muted-foreground text-center">
            {t("reminders.empty", { defaultValue: "No reminders yet." })}
          </div>
        )}
        <div className="max-h-80 overflow-y-auto">
          {items.map((r: any) => {
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
