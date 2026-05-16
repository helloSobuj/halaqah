import * as React from "react";
import { Link2, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function originUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://halaqah.lovable.app";
}

export function BookShareMenu({
  slug,
  title,
  variant = "button",
}: {
  slug: string;
  title: string;
  variant?: "button" | "icon";
}) {
  const [busy, setBusy] = React.useState(false);
  const url = `${originUrl()}/library/${slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const nativeShare = async () => {
    setBusy(true);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: `${title} — ${url}`, url });
      } else {
        await copyLink();
      }
    } catch (e: unknown) {
      const name = (e as { name?: string }).name;
      if (name !== "AbortError") toast.error("Could not share");
    } finally {
      setBusy(false);
    }
  };

  const openSocial = (channel: "whatsapp" | "facebook" | "x" | "telegram") => {
    const text = `${title} — ${url}`;
    const enc = encodeURIComponent;
    let href = "";
    if (channel === "whatsapp") href = `https://wa.me/?text=${enc(text)}`;
    else if (channel === "facebook") href = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
    else if (channel === "x") href = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;
    else if (channel === "telegram") href = `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" disabled={busy} aria-label="Share">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          </Button>
        ) : (
          <Button variant="outline" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Share2 className="h-4 w-4 mr-1.5" />}
            Share
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Share this book</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyLink} className="cursor-pointer">
          <Link2 className="h-4 w-4 mr-2" /> Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={nativeShare} className="cursor-pointer">
          <Share2 className="h-4 w-4 mr-2" /> Share…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openSocial("whatsapp")} className="cursor-pointer">WhatsApp</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openSocial("facebook")} className="cursor-pointer">Facebook</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openSocial("x")} className="cursor-pointer">X (Twitter)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openSocial("telegram")} className="cursor-pointer">Telegram</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
