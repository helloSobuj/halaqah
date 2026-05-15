// Lightweight, stable browser fingerprint for anti-cheat (NOT a security boundary).
// Browsers cannot expose MAC addresses; we hash a few stable client attributes.
export async function getFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "ssr";
  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency ?? ""),
  ].join("|");
  const buf = new TextEncoder().encode(parts);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
