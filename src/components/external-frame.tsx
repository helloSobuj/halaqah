import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExternalFrame({ title, src }: { title: string; src: string }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="h-12 flex items-center gap-2 px-3 border-b border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-top)]">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link to="/" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-sm font-semibold flex-1 truncate">{title}</h1>
        <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="Open in new tab">
          <a href={src} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </header>
      <iframe
        src={src}
        title={title}
        className="flex-1 w-full border-0"
        allow="fullscreen; clipboard-write; autoplay"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
