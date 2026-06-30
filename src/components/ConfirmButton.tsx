"use client";
import { useState } from "react";

export function ConfirmButton({
  children,
  confirmLabel = "Yes, delete",
  className,
}: {
  children: React.ReactNode;
  confirmLabel?: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="font-body text-sm transition-colors"
          style={{ color: "var(--color-terracotta)" }}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="font-body text-sm text-ink/40 hover:text-ink/60 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={className}
    >
      {children}
    </button>
  );
}
