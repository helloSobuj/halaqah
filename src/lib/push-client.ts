// Client-side helper to register the service worker and subscribe to push.
// Designed to no-op in iframe/preview contexts and when VAPID keys are absent.

import { subscribePush, unsubscribePush, getVapidPublicKey } from "@/lib/reminder.functions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function bufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function isPreviewIframe(): boolean {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  return /id-preview--|lovableproject\.com|lovable\.app$/.test(window.location.hostname) === false
    ? false
    : window.location.hostname.includes("id-preview--");
}

export async function ensurePushSubscribed(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined") return { ok: false, reason: "no-window" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  if (isPreviewIframe()) return { ok: false, reason: "iframe-preview" };

  const { key } = await getVapidPublicKey();
  if (!key) return { ok: false, reason: "no-vapid" };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  const json = sub.toJSON();
  await subscribePush({
    data: {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? bufferToBase64(sub.getKey("p256dh")),
      auth: json.keys?.auth ?? bufferToBase64(sub.getKey("auth")),
      userAgent: navigator.userAgent.slice(0, 280),
    },
  });
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await unsubscribePush({ data: { endpoint: sub.endpoint } });
    await sub.unsubscribe();
  }
}
