import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggleLang } = useLanguage();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      className={className}
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4 mr-1.5" />
      <span className="font-medium">{lang === "en" ? "বাং" : "EN"}</span>
    </Button>
  );
}
