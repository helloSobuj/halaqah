import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Image as ImageIcon, Share2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { recordShare } from "@/lib/events.functions";
import { generateShareImage } from "./share-image";

type Props = {
  event: {
    id: string;
    slug: string;
    title_en: string;
    title_bn: string;
    cover_image_url: string | null;
    starts_at: string;
    timezone: string;
    mode: "online" | "offline" | "hybrid";
    venue: string | null;
  };
  variant?: "button" | "icon";
};

function originUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://halaqah.lovable.app";
}

export function ShareMenu({ event, variant = "button" }: Props) {
  const recordFn = useServerFn(recordShare);
  const [busy, setBusy] = React.useState(false);

  const url = `${originUrl()}/events/${event.slug}`;
  const qrTarget = `${originUrl()}/api/public/events/${event.slug}/qr`;
  const title = event.title_en;

  type ShareChannel =
    | "link"
    | "image"
    | "whatsapp"
    | "facebook"
    | "x"
    | "telegram"
    | "native"
    | "qr_scan";
  const log = (channel: ShareChannel) =>
    recordFn({ data: { eventId: event.id, channel } }).catch(() => {});

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
      log("link");
    } catch {
      toast.error("Could not copy");
    }
  };

  const buildImage = async () => {
    const dateLabel = new Date(event.starts_at).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return generateShareImage({
      title,
      dateLabel,
      venue: event.venue,
      mode: event.mode,
      coverImageUrl: event.cover_image_url,
      brandName: "Halaqah",
      qrTargetUrl: qrTarget,
    });
  };

  const downloadImage = async () => {
    setBusy(true);
    try {
      const blob = await buildImage();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${event.slug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success("Image downloaded");
      log("image");
    } catch (e) {
      toast.error("Could not generate image");
    } finally {
      setBusy(false);
    }
  };

  const nativeShare = async () => {
    setBusy(true);
    try {
      const blob = await buildImage();
      const file = new File([blob], `${event.slug}.png`, { type: "image/png" });
      const data: ShareData = {
        title,
        text: `${title} — ${url}`,
        url,
      };
      const canShareFiles =
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] });
      if (canShareFiles) {
        await navigator.share({ ...data, files: [file] });
      } else if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
      } else {
        await copyLink();
        return;
      }
      log("native");
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
    log(channel);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" disabled={busy} aria-label="Share">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          </Button>
        ) : (
          <Button variant="outline" size="lg" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-1.5" />
            )}
            Share
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Share this event</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyLink} className="cursor-pointer">
          <Link2 className="h-4 w-4 mr-2" /> Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadImage} className="cursor-pointer">
          <Download className="h-4 w-4 mr-2" /> Download image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={nativeShare} className="cursor-pointer">
          <ImageIcon className="h-4 w-4 mr-2" /> Share with image…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openSocial("whatsapp")} className="cursor-pointer">
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openSocial("facebook")} className="cursor-pointer">
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openSocial("x")} className="cursor-pointer">
          X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openSocial("telegram")} className="cursor-pointer">
          Telegram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
