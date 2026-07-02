"use client";

import { useRouter } from "next/navigation";

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className={className ?? "font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"}
    >
      ←
    </button>
  );
}
