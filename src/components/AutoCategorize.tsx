"use client";

import { useEffect, useRef, useState } from "react";

type Category = { id: string; name: string };

export function AutoCategorize({
  categories,
  noteInputName = "note",
  categorySelectName = "category_id",
}: {
  categories: Category[];
  noteInputName?: string;
  categorySelectName?: string;
}) {
  const [suggestion, setSuggestion] = useState<Category | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNote = useRef("");

  useEffect(() => {
    // Find the note input and category select in the same form
    function onNoteChange(e: Event) {
      const note = (e.target as HTMLInputElement).value.trim();
      if (note === lastNote.current) return;
      lastNote.current = note;
      setSuggestion(null);
      setStatus("idle");

      if (timerRef.current) clearTimeout(timerRef.current);
      if (note.length < 3) return;

      timerRef.current = setTimeout(async () => {
        setStatus("loading");
        try {
          const res = await fetch("/api/ai/categorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note, categories }),
          });
          if (!res.ok) return;
          const { category_id } = await res.json() as { category_id: string | null };
          if (category_id) {
            const cat = categories.find(c => c.id === category_id);
            if (cat) {
              setSuggestion(cat);
              setStatus("done");
              return;
            }
          }
        } catch { /* silent */ }
        setStatus("idle");
      }, 700);
    }

    const noteInput = document.querySelector<HTMLInputElement>(
      `input[name="${noteInputName}"], textarea[name="${noteInputName}"]`,
    );
    noteInput?.addEventListener("input", onNoteChange);
    return () => {
      noteInput?.removeEventListener("input", onNoteChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [categories, noteInputName]);

  function accept() {
    if (!suggestion) return;
    const select = document.querySelector<HTMLSelectElement>(
      `select[name="${categorySelectName}"]`,
    );
    if (select) {
      select.value = suggestion.id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setSuggestion(null);
    setStatus("idle");
  }

  if (status === "loading") {
    return (
      <p className="font-body text-xs text-ink/35 flex items-center gap-1.5 mt-1">
        <span className="inline-block w-3 h-3 border border-ink/20 border-t-ink/60 rounded-full animate-spin" />
        Suggesting category…
      </p>
    );
  }

  if (status === "done" && suggestion) {
    return (
      <p className="font-body text-xs text-ink/50 flex items-center gap-2 mt-1">
        <span className="text-ink/30">✦</span>
        Suggested:
        <button
          type="button"
          onClick={accept}
          className="text-sage underline underline-offset-2 hover:text-sage/80 transition-colors"
        >
          {suggestion.name}
        </button>
        <button
          type="button"
          onClick={() => { setSuggestion(null); setStatus("idle"); }}
          className="text-ink/25 hover:text-ink/50 transition-colors ml-auto"
        >
          ×
        </button>
      </p>
    );
  }

  return null;
}
