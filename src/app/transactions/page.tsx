import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const monthFmt = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; imported?: string; skipped?: string }>;
}) {
  const { q, category, imported, skipped } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon")
    .order("name");

  let query = supabase
    .from("transactions")
    .select("id, amount, note, occurred_at, categories(name, icon), accounts(name)")
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (q?.trim()) {
    query = query.ilike("note", `%${q.trim()}%`);
  }

  if (category) {
    query = query.eq("category_id", category);
  }

  const { data: transactions } = await query;

  // Group by month then by day
  const byMonth = new Map<string, Map<string, typeof transactions>>();
  for (const t of transactions ?? []) {
    const monthKey = t.occurred_at.slice(0, 7); // "2026-06"
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, new Map());
    const byDay = byMonth.get(monthKey)!;
    byDay.set(t.occurred_at, [...(byDay.get(t.occurred_at) ?? []), t]);
  }

  const hasFilter = !!q?.trim() || !!category;
  const count = transactions?.length ?? 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
          >
            ←
          </a>
          <h1 className="font-display text-lg">Transactions</h1>
        </div>
        <a href="/import" className="font-body text-xs text-ink/40 hover:text-ink/70 transition-colors">
          Import
        </a>
      </header>

      {imported && (
        <p className="font-body mx-6 mb-2 rounded-md bg-mist/40 px-3 py-2 text-sm text-ink/70">
          {imported} transaction{Number(imported) !== 1 ? "s" : ""} imported
          {skipped ? `, ${skipped} skipped` : ""}.
        </p>
      )}

      <form method="GET" className="flex flex-col gap-2 px-6 pb-2">
        <input
          name="q"
          type="text"
          defaultValue={q ?? ""}
          placeholder="Search notes…"
          className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage"
        />
        <div className="flex gap-2">
          <select
            name="category"
            defaultValue={category ?? ""}
            className="font-body flex-1 rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage"
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.icon, c.name].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="font-body rounded-md bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
          >
            Filter
          </button>
          {hasFilter && (
            <a
              href="/transactions"
              className="font-body rounded-md border border-mist px-3 py-2 text-sm text-ink/60 transition-colors hover:text-ink"
            >
              Clear
            </a>
          )}
        </div>
      </form>

      <p className="px-6 pb-4 font-body text-xs text-ink/40">
        {hasFilter
          ? `${count} result${count !== 1 ? "s" : ""}`
          : `${count} most recent`}
      </p>

      <div className="flex flex-col gap-6 px-6 pb-12">
        {byMonth.size === 0 && (
          <p className="pt-4 text-center font-body text-sm text-ink/60">
            {hasFilter
              ? "Nothing matches that filter."
              : "No transactions yet."}
          </p>
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
                    {items?.map((t) => (
                      <a
                        key={t.id}
                        href={`/transactions/${t.id}/edit`}
                        className="flex items-center justify-between px-3 py-2 transition-colors hover:bg-mist/30"
                      >
                        <div className="flex flex-col">
                          <span className="font-body text-sm">
                            {[t.categories?.icon, t.categories?.name ?? "Uncategorized"].filter(Boolean).join(" ")}
                          </span>
                          {t.note && (
                            <span className="font-body text-xs text-ink/60">
                              {t.note}
                            </span>
                          )}
                          {t.accounts?.name && (
                            <span className="font-body text-xs text-ink/40">
                              {t.accounts.name}
                            </span>
                          )}
                        </div>
                        <span className="font-body tabular-nums text-sm">
                          {t.amount < 0 ? "−" : "+"}
                          {formatThb(Math.abs(t.amount))}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}
