import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setQuizReminder, cancelQuizReminder, myQuizReminderStatus } from "@/lib/reminder.functions";
import { ensurePushSubscribed } from "@/lib/push-client";
import { useAuth } from "@/hooks/use-auth";

export function ReminderButton({ quizId, minutesBefore = 15 }: { quizId: string; minutesBefore?: number }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const statusFn = useServerFn(myQuizReminderStatus);
  const setFn = useServerFn(setQuizReminder);
  const cancelFn = useServerFn(cancelQuizReminder);

  const status = useQuery({
    queryKey: ["reminder-status", quizId],
    queryFn: () => statusFn({ data: { quizId } }),
    enabled: !!user,
  });

  const setMut = useMutation({
    mutationFn: async () => {
      const res = await setFn({ data: { quizId, minutesBefore } });
      // attempt push subscription (no-op if not available)
      const push = await ensurePushSubscribed();
      return { res, push };
    },
    onSuccess: ({ push }) => {
      qc.invalidateQueries({ queryKey: ["reminder-status", quizId] });
      qc.invalidateQueries({ queryKey: ["my-reminders"] });
      if (push.ok) toast.success(t("reminders.setWithPush", { defaultValue: "Reminder set with browser push" }));
      else toast.success(t("reminders.setInApp", { defaultValue: "Reminder set (in-app only)" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelFn({ data: { quizId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminder-status", quizId] });
      qc.invalidateQueries({ queryKey: ["my-reminders"] });
      toast.success(t("reminders.cancelled", { defaultValue: "Reminder cancelled" }));
    },
  });

  if (!user) return null;
  const isSet = !!status.data;

  return (
    <Button
      type="button"
      size="sm"
      variant={isSet ? "secondary" : "outline"}
      onClick={() => (isSet ? cancelMut.mutate() : setMut.mutate())}
      disabled={setMut.isPending || cancelMut.isPending}
      title={isSet ? t("reminders.cancel", { defaultValue: "Cancel reminder" }) : t("reminders.set", { defaultValue: "Remind me" })}
    >
      {isSet ? <BellRing className="h-3.5 w-3.5 mr-1.5 text-primary" /> : <Bell className="h-3.5 w-3.5 mr-1.5" />}
      {isSet ? t("reminders.on", { defaultValue: "Reminder on" }) : t("reminders.remindMe", { defaultValue: "Remind me" })}
    </Button>
  );
}
