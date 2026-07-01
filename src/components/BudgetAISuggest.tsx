"use client";

import { useState } from "react";
import { formatThb } from "@/lib/format";

type CatAvg = { id: string; name: string; avg: number };

type Suggestion = {
  id: string | null;
  name: string;
  amount: number;
  tip: string;
};

export function BudgetAISuggest({
  categories,
  totalAvg,
}: {
  categories: CatAvg[];
  totalAvg: number;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [suggestions, setSuggestions] = useState<{ total: number; categories: Suggestion[] } | null>(null);

  async function generate() {
    setState("loading");
    try {
      const res = await fetch("/api/ai/budget-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, totalAvg }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { total: number; categories: Suggestion[] };
      setSuggestions(data);
      setState("done");
    } catch {
      setState("error");
    }
  }

  function applyAll() {
    if (!suggestions) return;

    // Apply total budget
    const totalInput = document.querySelector<HTMLInputElement>("input[name='total_amount']");
    if (totalInput) totalInput.value = String(suggestions.total);

    // Apply category lines
    for (const s of suggestions.categories) {
      if (!s.id) continue;
      const input = document.querySelector<HTMLInputElement>(`input[name='line_${s.id}']`);
      if (input) input.value = String(s.amount);
    }

    setState("idle");
    setSuggestions(null);
  }

  if (state === "idle" && totalAvg > 0) {
    return (
      <button
        type="button"
        onClick={generate}
        className="font-body text-xs text-ink/40 hover:text-sage transition-colors flex items-center gap-1.5 mt-1"
      >
        <span>✦</span> Suggest with AI
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="mt-3 rounded-2xl border border-mist bg-surface px-4 py-3 flex items-center gap-2">
        <span className="inline-block w-3 h-3 border border-ink/20 border-t-ink/60 rounded-full animate-spin shrink-0" />
        <p className="font-body text-xs text-ink/50">Gemini is analysing your spending…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <p className="font-body text-xs text-ink/40 mt-1">
        Could not generate suggestions.{" "}
        <button type="button" onClick={generate} className="underline hover:text-ink/60">
          Retry
        </button>
      </p>
    );
  }

  if (state === "done" && suggestions) {
    return (
      <div className="mt-4 rounded-2xl border border-sage/30 bg-sage/5 px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-body text-xs text-ink/50 flex items-center gap-1.5">
            <span className="text-sage">✦</span> AI budget suggestion
          </p>
          <button
            type="button"
            onClick={() => { setState("idle"); setSuggestions(null); }}
            className="font-body text-xs text-ink/30 hover:text-ink/60 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="font-body text-sm text-ink/60">Total budget</span>
          <span className="font-display text-xl tabular-nums">{formatThb(suggestions.total)}</span>
        </div>

        <div className="flex flex-col gap-2">
          {suggestions.categories.filter(s => s.id).map(s => (
            <div key={s.id} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs text-ink/60">{s.name}</span>
                <span className="font-body text-xs tabular-nums">{formatThb(s.amount)}</span>
              </div>
              {s.tip && (
                <p className="font-body text-[11px] text-ink/35 leading-snug">{s.tip}</p>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={applyAll}
          className="font-body mt-1 rounded-xl bg-ink text-paper py-2 text-sm transition-opacity hover:opacity-90"
        >
          Apply suggestions
        </button>
      </div>
    );
  }

  return null;
}
