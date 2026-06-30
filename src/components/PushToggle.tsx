"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export function PushToggle() {
  const [status, setStatus] = useState<"unsupported" | "default" | "granted" | "denied" | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(
      Notification.permission === "granted" ? "granted" :
      Notification.permission === "denied" ? "denied" : "default"
    );
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const res = await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setStatus("granted");
    } catch (err) {
      console.error("Push subscribe failed:", err);
      setStatus("default");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push-subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("default");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <span className="font-body text-xs text-ink/30">…</span>;
  if (status === "unsupported") return <span className="font-body text-xs text-ink/40">Not supported</span>;
  if (status === "denied") return (
    <span className="font-body text-xs text-ink/40">
      Blocked — enable in browser settings
    </span>
  );

  return (
    <button
      onClick={status === "granted" ? disable : enable}
      disabled={busy}
      className="font-body text-xs px-3 py-1 rounded-full border transition-colors"
      style={{
        borderColor: status === "granted" ? "var(--color-sage)" : "var(--color-mist)",
        color: status === "granted" ? "var(--color-sage)" : "var(--color-ink)",
        opacity: busy ? 0.5 : 1,
      }}
    >
      {busy ? "…" : status === "granted" ? "On" : "Off"}
    </button>
  );
}
