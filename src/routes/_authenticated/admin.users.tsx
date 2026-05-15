import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Search, Shield, ShieldCheck, GraduationCap, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listUsers, setUserRole } from "@/lib/admin.functions";
import { useUserRole, type AppRole } from "@/hooks/use-user-role";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

const ALL_ROLES: AppRole[] = ["admin", "moderator", "scholar", "user"];

const ROLE_META: Record<AppRole, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  admin: { icon: Shield, tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  moderator: { icon: ShieldCheck, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  scholar: { icon: GraduationCap, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  user: { icon: UserIcon, tone: "bg-muted text-muted-foreground" },
};

function UsersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const qc = useQueryClient();
  const { isAdmin } = useUserRole();

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  const list = useServerFn(listUsers);
  const setRole = useServerFn(setUserRole);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", debounced],
    queryFn: () => list({ data: { search: debounced } }),
  });

  const mut = useMutation({
    mutationFn: (vars: { userId: string; role: AppRole; grant: boolean }) =>
      setRole({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("admin.roleUpdated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.searchUsers")}
          className="pl-9"
        />
      </div>

      <Card className="divide-y divide-border">
        {isLoading && <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>}
        {!isLoading && (data?.users.length ?? 0) === 0 && (
          <div className="p-6 text-sm text-muted-foreground">{t("admin.noUsers")}</div>
        )}
        {data?.users.map((u) => {
          const initials = (u.displayName ?? "U").slice(0, 2).toUpperCase();
          return (
            <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/15 text-primary text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {u.displayName ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {u.location ?? ""}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {u.roles.length === 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {t("admin.noRoles")}
                  </Badge>
                )}
                {u.roles.map((r) => {
                  const Meta = ROLE_META[r as AppRole];
                  const Icon = Meta.icon;
                  return (
                    <span
                      key={r}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${Meta.tone}`}
                    >
                      <Icon className="h-3 w-3" />
                      {t(`admin.role.${r}`)}
                    </span>
                  );
                })}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map((r) => {
                    const has = u.roles.includes(r);
                    return (
                      <Button
                        key={r}
                        size="sm"
                        variant={has ? "default" : "outline"}
                        disabled={mut.isPending}
                        onClick={() => mut.mutate({ userId: u.id, role: r, grant: !has })}
                      >
                        {has ? "−" : "+"} {t(`admin.role.${r}`)}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
