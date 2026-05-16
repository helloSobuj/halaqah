import QRCode from "qrcode";

export type ShareImageInput = {
  title: string;
  dateLabel: string;
  venue: string | null;
  mode: "online" | "offline" | "hybrid";
  coverImageUrl: string | null;
  brandName: string;
  qrTargetUrl: string;
};

// Generates an Open Graph–sized PNG (1200x630) share card with a QR code.
// Uses a Canvas in the browser — works without server image-rendering deps.
export async function generateShareImage(input: ShareImageInput): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, H);

  // Cover image (if any), dimmed
  if (input.coverImageUrl) {
    try {
      const img = await loadImage(input.coverImageUrl);
      // cover-fit
      const ratio = Math.max(W / img.width, H / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      ctx.drawImage(img, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH);
      // Dark gradient overlay for readability
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(15,23,42,0.55)");
      grad.addColorStop(1, "rgba(15,23,42,0.92)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } catch {
      // ignore; use solid bg
    }
  } else {
    // gradient brand fallback
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#1e3a8a");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Brand strip
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(0, 0, 8, H);

  // Brand name
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 28px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(input.brandName, 60, 56);

  // Date label
  ctx.fillStyle = "#fbbf24";
  ctx.font = "600 30px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(input.dateLabel.toUpperCase(), 60, 200);

  // Title (wrap)
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 62px system-ui, -apple-system, 'Segoe UI', sans-serif";
  wrapText(ctx, input.title, 60, 250, W - 380, 72);

  // Venue / mode line at bottom-left
  const locLine =
    input.mode === "online"
      ? "Online event"
      : input.venue
        ? input.venue
        : input.mode === "hybrid"
          ? "Hybrid event"
          : "";
  if (locLine) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "500 26px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(locLine, 60, H - 90);
  }

  // QR panel (bottom right)
  const qrSize = 220;
  const panelPad = 24;
  const panelW = qrSize + panelPad * 2;
  const panelH = qrSize + panelPad * 2 + 36;
  const px = W - panelW - 48;
  const py = H - panelH - 48;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, px, py, panelW, panelH, 20);
  ctx.fill();

  // QR
  const qrDataUrl = await QRCode.toDataURL(input.qrTargetUrl, {
    margin: 0,
    width: qrSize,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, px + panelPad, py + panelPad, qrSize, qrSize);

  // Caption
  ctx.fillStyle = "#0f172a";
  ctx.font = "600 18px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Scan to open event", px + panelW / 2, py + panelPad + qrSize + 10);
  ctx.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to render image"))),
      "image/png",
      0.92,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
) {
  const words = text.split(/\s+/);
  let line = "";
  let lines: string[] = [];
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    while (ctx.measureText(last + "…").width > maxWidth && lines[maxLines - 1].length > 0) {
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1);
    }
    lines[maxLines - 1] = lines[maxLines - 1].trimEnd() + "…";
  }
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
}
