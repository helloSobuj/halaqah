import * as React from "react";

export function useCountdown(startedAt: string | null, remainingSeconds: number) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return remainingSeconds;
  const elapsed = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  return Math.max(0, remainingSeconds - elapsed);
}

export function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Returns tailwind bg class based on remaining vs total (percent used). */
export function bgForRemaining(remaining: number, total: number) {
  if (total <= 0) return "bg-primary/10";
  const usedPct = 1 - remaining / total;
  if (remaining <= 0) return "bg-red-600/90 animate-pulse text-white";
  if (usedPct >= 0.9) return "bg-red-500/80 text-white";
  if (usedPct >= 0.7) return "bg-orange-500/80 text-white";
  return "bg-primary/10";
}
