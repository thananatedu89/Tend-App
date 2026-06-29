"use client";

import { useState } from "react";

export function NoteInput({
  defaultValue = "",
  suggestions,
}: {
  defaultValue?: string;
  suggestions: string[];
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex flex-col gap-2">
      <input
        id="note"
        name="note"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Note (optional)"
        className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setValue(s)}
              className={`font-body text-xs rounded-full px-2.5 py-1 border transition-colors ${
                value === s
                  ? "border-ink bg-ink text-paper"
                  : "border-mist text-ink/60 hover:bg-mist/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
