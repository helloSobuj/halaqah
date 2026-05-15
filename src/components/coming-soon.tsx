import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Construction } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export function ComingSoonPage({ titleKey, descKey }: { titleKey: string; descKey: string }) {
  const { t } = useTranslation();
  return (
    <AppShell>
      <div className="px-4 lg:px-8 py-8 lg:py-12 max-w-4xl mx-auto">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">{t(titleKey)}</h1>
        <p className="mt-2 text-muted-foreground">{t(descKey)}</p>
        <Card className="mt-6 p-8 lg:p-12 text-center border-dashed">
          <Construction className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold text-foreground">{t("common.comingSoon")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This module will be built in the next phase.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

// Stub route — keeps nav alive until Phase 3 builds out the real module.
function makeStub(titleKey: string, descKey: string) {
  return () => <ComingSoonPage titleKey={titleKey} descKey={descKey} />;
}

export { makeStub };

export const Route = createFileRoute("/_coming-soon-helper")({
  component: () => null,
});
