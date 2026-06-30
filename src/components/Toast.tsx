"use client";
import { useEffect, useState } from "react";

export function Toast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get("toast");
    if (!msg) return;

    setMessage(decodeURIComponent(msg));
    params.delete("toast");
    const qs = params.toString();
    const newUrl =
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);

    const timer = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(timer);
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4"
    >
      <div className="font-body text-sm bg-ink text-paper px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap">
        {message}
      </div>
    </div>
  );
}
