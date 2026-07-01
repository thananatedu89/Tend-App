"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CategoryBadge, catOptionLabel } from "@/components/CategoryIcon";
import { formatThb } from "@/lib/format";

type TxRow = {
  id: string;
  amount: number;
  note: string | null;
  occurred_at: string;
  is_recurring: boolean;
  categories: { name: string; icon: string | null; color: string | null } | null;
  accounts: { name: string } | null;
};

type Category = { id: string; name: string; icon: string | null };

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const monthFmt = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const RecurringIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-ink/30 shrink-0"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

function TxContent({ t }: { t: TxRow }) {
  return (
    <>
      <CategoryBadge icon={t.categories?.icon} color={t.categories?.color} />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-body text-sm flex items-center gap-1.5">
          {t.categories?.name ?? "Uncategorized"}
          {t.is_recurring && <RecurringIcon />}
        </span>
        {t.note && <span className="font-body text-xs text-ink/50 truncate">{t.note}</span>}
        {t.accounts?.name && <span className="font-body text-xs text-ink/40">{t.accounts.name}</span>}
      </div>
      <span className={`font-body tabular-nums text-sm shrink-0 ${t.amount > 0 ? "text-sage" : ""}`}>
        {t.amount < 0 ? "−" : "+"}
        {formatThb(Math.abs(t.amount))}
      </span>
    </>
  );
}

export function BulkActions({
  transactions,
  categories,
  hasFilter,
  count,
}: {
  transactions: TxRow[];
  categories: Category[];
  hasFilter: boolean;
  count: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recatId, setRecatId] = useState("");
  const [working, setWorking] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((t) => t.id)));
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
    setRecatId("");
  }

  async function handleDelete() {
    if (selected.size === 0 || working) return;
    if (!confirm(`Delete ${selected.size} transaction${selected.size !== 1 ? "s" : ""}?`)) return;
    setWorking(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (res.ok) {
        exitSelectMode();
        startTransition(() => router.refresh());
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleRecategorize() {
    if (selected.size === 0 || !recatId || working) return;
    setWorking(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], category_id: recatId }),
      });
      if (res.ok) {
        exitSelectMode();
        startTransition(() => router.refresh());
      }
    } finally {
      setWorking(false);
    }
  }

  // Group by month then day
  const byMonth = new Map<string, Map<string, TxRow[]>>();
  for (const t of transactions) {
    const monthKey = t.occurred_at.slice(0, 7);
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, new Map());
    const byDay = byMonth.get(monthKey)!;
    byDay.set(t.occurred_at, [...(byDay.get(t.occurred_at) ?? []), t]);
  }

  return (
    <>
      {/* Count + select toggle */}
      <div className="flex items-center justify-between px-6 pb-4">
        <p className="font-body text-xs text-ink/40">
          {hasFilter ? `${count} result${count !== 1 ? "s" : ""}` : `${count} most recent`}
        </p>
        {transactions.length > 0 && (
          selectMode ? (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="font-body text-xs text-ink/50 hover:text-ink/80 transition-colors"
              >
                {selected.size === transactions.length ? "Deselect all" : "Select all"}
              </button>
              <button
                onClick={exitSelectMode}
                className="font-body text-xs text-ink/40 hover:text-ink/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="font-body text-xs text-ink/40 hover:text-ink/70 transition-colors"
            >
              Select
            </button>
          )
        )}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-6 px-6 pb-32">
        {byMonth.size === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-ink/20"
            >
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            <p className="font-body text-sm text-ink/40">
              {hasFilter ? "Nothing matches that filter." : "No transactions yet."}
            </p>
          </div>
        )}

        {[...byMonth.entries()].map(([monthKey, byDay]) => {
          const [y, m] = monthKey.split("-").map(Number);
          const monthDate = new Date(y, (m ?? 1) - 1, 1);
          return (
            <div key={monthKey} className="flex flex-col gap-3">
              <p className="font-body text-xs uppercase tracking-wide text-ink/40">
                {monthFmt.format(monthDate)}
              </p>
              {[...byDay.entries()].map(([date, items]) => (
                <div key={date} className="flex flex-col gap-1">
                  <p className="font-body text-xs text-ink/50">
                    {dayFmt.format(new Date(date + "T12:00:00"))}
                  </p>
                  <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
                    {items.map((t) => {
                      const isChecked = selected.has(t.id);
                      if (selectMode) {
                        return (
                          <div
                            key={t.id}
                            onClick={() => toggleSelect(t.id)}
                            className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
                              isChecked ? "bg-sage/10" : "hover:bg-mist/30"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelect(t.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-mist accent-sage shrink-0"
                            />
                            <TxContent t={t} />
                          </div>
                        );
                      }
                      return (
                        <a
                          key={t.id}
                          href={`/transactions/${t.id}/edit`}
                          className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-mist/30"
                        >
                          <TxContent t={t} />
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Sticky bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-20 inset-x-0 flex justify-center px-4 z-30 pointer-events-none">
          <div className="w-full max-w-sm bg-ink text-paper rounded-2xl px-4 py-3 flex flex-col gap-2.5 shadow-xl pointer-events-auto">
            <p className="font-body text-sm text-paper/60 text-center">
              {selected.size} selected
            </p>
            <div className="flex gap-2">
              <select
                value={recatId}
                onChange={(e) => setRecatId(e.target.value)}
                className="font-body flex-1 rounded-xl bg-paper/10 border border-paper/20 px-3 py-2 text-sm text-paper outline-none"
              >
                <option value="">Move to category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {catOptionLabel(c.name, c.icon)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleRecategorize}
                disabled={!recatId || working}
                className="font-body rounded-xl bg-sage px-3 py-2 text-sm text-paper disabled:opacity-40 shrink-0 transition-opacity"
              >
                Move
              </button>
            </div>
            <button
              onClick={handleDelete}
              disabled={working}
              className="font-body w-full rounded-xl border border-paper/20 py-2 text-sm text-paper/80 hover:bg-paper/10 transition-colors disabled:opacity-40"
            >
              {working ? "Working…" : `Delete ${selected.size}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
