import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — Halaqah" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = React.useState(false);
  const [hasSession, setHasSession] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // supabase-js processes the recovery token in the URL hash automatically
    // (detectSessionInUrl defaults true). Give it a tick, then check.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a new password for your account.
          </p>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !hasSession ? (
          <p className="text-sm text-destructive">
            This reset link is invalid or has expired. Please request a new link from an admin.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
