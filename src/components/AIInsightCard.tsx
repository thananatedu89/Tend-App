"use client";

import { useState } from "react";

export function AIInsightCard() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [summary, setSummary] = useState("");

  async function generate() {
    setState("loading");
    try {
      const res = await fetch("/api/ai/insights");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSummary(json.summary ?? "");
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <section className="rounded-2xl border border-mist bg-surface px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-body text-sm font-medium">AI spending summary</p>
          <p className="font-body text-xs text-ink/50 mt-0.5">90-day insights, powered by Gemini</p>
        </div>
        <button
          onClick={generate}
          className="font-body text-xs bg-ink text-paper rounded-full px-3 py-1.5 shrink-0 hover:bg-ink/80 transition-colors"
        >
          Generate
        </button>
      </section>
    );
  }

  if (state === "loading") {
    return (
      <section className="rounded-2xl border border-mist bg-surface px-5 py-5">
        <p className="font-body text-[10px] text-ink/35 uppercase tracking-widest mb-3">
          AI summary · thinking…
        </p>
        <div className="flex flex-col gap-2">
          <div className="h-2.5 bg-mist rounded-full animate-pulse w-full" />
          <div className="h-2.5 bg-mist rounded-full animate-pulse w-5/6" />
          <div className="h-2.5 bg-mist rounded-full animate-pulse w-4/6 mt-1" />
          <div className="h-2.5 bg-mist rounded-full animate-pulse w-full mt-2" />
          <div className="h-2.5 bg-mist rounded-full animate-pulse w-3/4" />
        </div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="rounded-2xl border border-mist bg-surface px-5 py-4 flex items-center justify-between gap-4">
        <p className="font-body text-sm text-ink/60">Could not generate summary.</p>
        <button
          onClick={generate}
          className="font-body text-xs text-ink/50 hover:text-ink transition-colors shrink-0"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-mist bg-surface px-5 py-5">
      <p className="font-body text-[10px] text-ink/35 uppercase tracking-widest mb-3">
        AI summary · Gemini
      </p>
      <div className="font-body text-sm text-ink/80 leading-relaxed whitespace-pre-wrap">
        {summary}
      </div>
      <button
        onClick={() => setState("idle")}
        className="font-body text-[11px] text-ink/30 hover:text-ink/60 transition-colors mt-4"
      >
        Regenerate
      </button>
    </section>
  );
}
