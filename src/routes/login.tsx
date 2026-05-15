import * as React from "react";
import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Sign in — Halaqah" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(t("auth.errorSignIn"));
      return;
    }
    navigate({ to: "/" });
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-foreground">{t("auth.welcomeBack")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.signInDesc")}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        {t("auth.noAccount")}{" "}
        <Link to="/signup" className="text-primary font-medium hover:underline">
          {t("auth.signUp")}
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <span className="text-primary-foreground font-bold">ﺡ</span>
          </div>
          <span className="font-bold text-foreground">Halaqah</span>
        </Link>
        <div className="flex gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md p-7 shadow-elegant">{children}</Card>
      </div>
    </div>
  );
}
