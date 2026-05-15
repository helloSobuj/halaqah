import * as React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggleLang } = useLanguage();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  // Render a stable label during SSR/hydration to avoid mismatch.
  const label = !mounted ? "EN" : lang === "en" ? "বাং" : "EN";
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      className={className}
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4 mr-1.5" />
      <span className="font-medium" suppressHydrationWarning>{label}</span>
    </Button>
  );
}
