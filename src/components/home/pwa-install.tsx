import * as React from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed";

export function PwaInstall() {
  const isBn = useLanguage().lang === "bn";
  const [deferred, setDeferred] = React.useState<BIPEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-4 md:left-auto md:right-4 md:max-w-sm z-40 rounded-2xl border border-border bg-card shadow-elegant p-4 flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{isBn ? "অ্যাপ ইনস্টল করুন" : "Install Halaqah"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isBn ? "দ্রুত অ্যাক্সেসের জন্য হোম স্ক্রিনে যোগ করুন।" : "Add to home screen for quick access."}
        </p>
        <div className="flex gap-2 mt-2.5">
          <Button
            size="sm"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice.catch(() => null);
              setVisible(false);
              localStorage.setItem(DISMISS_KEY, "1");
            }}
          >
            {isBn ? "ইনস্টল" : "Install"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setVisible(false);
              localStorage.setItem(DISMISS_KEY, "1");
            }}
          >
            {isBn ? "পরে" : "Later"}
          </Button>
        </div>
      </div>
      <button
        aria-label="close"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => {
          setVisible(false);
          localStorage.setItem(DISMISS_KEY, "1");
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
