"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("tend_theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  function select(t: Theme) {
    setTheme(t);
    if (t === "system") {
      localStorage.removeItem("tend_theme");
    } else {
      localStorage.setItem("tend_theme", t);
    }
    applyTheme(t);
  }

  return (
    <div className="flex rounded-full border border-mist bg-paper overflow-hidden">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => select(opt.value)}
          className={`flex-1 py-1.5 font-body text-xs transition-colors ${
            theme === opt.value
              ? "bg-ink text-paper"
              : "text-ink/50 hover:text-ink/80"
          }`}
          style={{ borderRadius: 0 }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
