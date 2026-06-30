"use client";
import { useRef, useState } from "react";
import { catOptionLabel } from "@/components/CategoryIcon";

type Cat = { id: string; name: string; icon: string | null; color: string | null };

function buildHref(params: Record<string, string | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return `/transactions${s ? `?${s}` : ""}`;
}

export function TransactionFilters({
  categories,
  q,
  category,
  date_from,
  date_to,
  type,
}: {
  categories: Cat[];
  q?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  type?: string;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(!!(category || date_from || date_to));

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const thisMonthFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  const presets = [
    { label: "This week", from: weekAgo.toISOString().slice(0, 10), to: todayStr },
    { label: "This month", from: thisMonthFrom, to: todayStr },
    { label: "Last month", from: prevStart.toISOString().slice(0, 10), to: prevEnd.toISOString().slice(0, 10) },
  ];

  const activePreset = presets.find((p) => p.from === date_from && p.to === date_to);
  const hasAdvanced = !!(category || date_from || date_to);
  const hasAny = !!(q || type || category || date_from || date_to);

  const debounce = (fn: () => void) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, 350);
  };

  return (
    <div className="flex flex-col gap-2 px-6 pb-2">
      {/* Search — hidden inputs carry other active filters */}
      <form method="GET">
        {type && <input type="hidden" name="type" value={type} />}
        {category && <input type="hidden" name="category" value={category} />}
        {date_from && <input type="hidden" name="date_from" value={date_from} />}
        {date_to && <input type="hidden" name="date_to" value={date_to} />}
        <input
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Search notes or categories…"
          autoComplete="off"
          className="font-body w-full rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-sage"
          onChange={(e) => debounce(() => (e.target.form as HTMLFormElement).requestSubmit())}
        />
      </form>

      {/* Type pills + more-filters toggle */}
      <div className="flex items-center gap-1.5">
        {(["All", "Expenses", "Income"] as const).map((label) => {
          const val = label === "All" ? "" : label === "Expenses" ? "expense" : "income";
          const active = (type ?? "") === val;
          return (
            <a
              key={label}
              href={buildHref({ q, category, date_from, date_to, type: val || null })}
              className={`font-body text-xs px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-ink text-paper border-ink"
                  : "border-mist text-ink/60 hover:border-ink/30"
              }`}
            >
              {label}
            </a>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`ml-auto font-body text-xs px-3 py-1.5 rounded-full border transition-colors ${
            hasAdvanced
              ? "bg-sage/15 border-sage/40 text-sage"
              : "border-mist text-ink/50 hover:border-ink/30"
          }`}
        >
          {open ? "Less ▲" : `Filters${hasAdvanced ? " ●" : " ▼"}`}
        </button>
      </div>

      {/* Advanced panel */}
      {open && (
        <div className="flex flex-col gap-2 pt-0.5">
          {/* Category — auto-submits on change */}
          <form method="GET">
            {q && <input type="hidden" name="q" value={q} />}
            {type && <input type="hidden" name="type" value={type} />}
            {date_from && <input type="hidden" name="date_from" value={date_from} />}
            {date_to && <input type="hidden" name="date_to" value={date_to} />}
            <select
              name="category"
              defaultValue={category ?? ""}
              onChange={(e) => (e.target.form as HTMLFormElement).requestSubmit()}
              className="font-body w-full rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-sage"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {catOptionLabel(c.name, c.icon)}
                </option>
              ))}
            </select>
          </form>

          {/* Quick date presets */}
          <div className="flex gap-1.5 flex-wrap">
            {presets.map((p) => {
              const active = activePreset?.label === p.label;
              return (
                <a
                  key={p.label}
                  href={buildHref({
                    q,
                    category,
                    type,
                    date_from: active ? null : p.from,
                    date_to: active ? null : p.to,
                  })}
                  className={`font-body text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-ink text-paper border-ink"
                      : "border-mist text-ink/60 hover:border-ink/30"
                  }`}
                >
                  {p.label}
                </a>
              );
            })}
          </div>

          {/* Custom date range — auto-submits on change */}
          <form method="GET" className="flex gap-2 items-center">
            {q && <input type="hidden" name="q" value={q} />}
            {type && <input type="hidden" name="type" value={type} />}
            {category && <input type="hidden" name="category" value={category} />}
            <input
              name="date_from"
              type="date"
              defaultValue={date_from ?? ""}
              className="font-body flex-1 rounded-xl border border-mist bg-paper px-2 py-2 text-sm text-ink outline-none focus:border-sage"
              onChange={(e) => debounce(() => (e.target.form as HTMLFormElement).requestSubmit())}
            />
            <span className="font-body text-xs text-ink/40">–</span>
            <input
              name="date_to"
              type="date"
              defaultValue={date_to ?? ""}
              className="font-body flex-1 rounded-xl border border-mist bg-paper px-2 py-2 text-sm text-ink outline-none focus:border-sage"
              onChange={(e) => debounce(() => (e.target.form as HTMLFormElement).requestSubmit())}
            />
          </form>
        </div>
      )}

      {/* Active filter chips */}
      {hasAny && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {type && (
            <a
              href={buildHref({ q, category, date_from, date_to })}
              className="font-body text-xs px-2.5 py-1 rounded-full bg-ink/8 text-ink/70 flex items-center gap-1 hover:bg-ink/15 transition-colors"
            >
              {type === "expense" ? "Expenses" : "Income"} ×
            </a>
          )}
          {category && (
            <a
              href={buildHref({ q, type, date_from, date_to })}
              className="font-body text-xs px-2.5 py-1 rounded-full bg-ink/8 text-ink/70 flex items-center gap-1 hover:bg-ink/15 transition-colors"
            >
              {categories.find((c) => c.id === category)?.name ?? "Category"} ×
            </a>
          )}
          {(date_from || date_to) && (
            <a
              href={buildHref({ q, type, category })}
              className="font-body text-xs px-2.5 py-1 rounded-full bg-ink/8 text-ink/70 flex items-center gap-1 hover:bg-ink/15 transition-colors"
            >
              {activePreset?.label ?? `${date_from ?? "…"} – ${date_to ?? "…"}`} ×
            </a>
          )}
          {hasAny && (
            <a
              href="/transactions"
              className="font-body text-xs px-2.5 py-1 rounded-full text-ink/40 hover:text-ink/70 transition-colors"
            >
              Clear all
            </a>
          )}
        </div>
      )}
    </div>
  );
}
