import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { CategoryBadge } from "@/components/CategoryIcon";
import { TransactionFilters } from "@/components/TransactionFilters";

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
  searchParams: Promise<{ q?: string; category?: string; date_from?: string; date_to?: string; type?: string; imported?: string; skipped?: string }>;
}) {
  const { q, category, date_from, date_to, type, imported, skipped } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon, color")
    .order("name");

  let query = supabase
    .from("transactions")
    .select("id, amount, note, occurred_at, is_recurring, categories(name, icon, color), accounts(name)")
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (q?.trim()) {
    const term = q.trim();
    const matchingCategoryIds = (categories ?? [])
      .filter((c) => c.name.toLowerCase().includes(term.toLowerCase()))
      .map((c) => c.id);
    if (matchingCategoryIds.length > 0) {
      query = query.or(`note.ilike.%${term}%,category_id.in.(${matchingCategoryIds.join(",")})`);
    } else {
      query = query.ilike("note", `%${term}%`);
    }
  }

  if (category) query = query.eq("category_id", category);
  if (date_from) query = query.gte("occurred_at", date_from);
  if (date_to) query = query.lte("occurred_at", date_to);
  if (type === "expense") query = query.lt("amount", 0);
  if (type === "income") query = query.gt("amount", 0);

  const { data: transactions } = await query;

  const byMonth = new Map<string, Map<string, typeof transactions>>();
  for (const t of transactions ?? []) {
    const monthKey = t.occurred_at.slice(0, 7);
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, new Map());
    const byDay = byMonth.get(monthKey)!;
    byDay.set(t.occurred_at, [...(byDay.get(t.occurred_at) ?? []), t]);
  }

  const hasFilter = !!q?.trim() || !!category || !!date_from || !!date_to || !!type;
  const count = transactions?.length ?? 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <a href="/" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
          <h1 className="font-display text-lg">Transactions</h1>
        </div>
        <a href="/import" className="font-body text-xs text-ink/40 hover:text-ink/70 transition-colors">Import</a>
      </header>

      {imported && (
        <p className="font-body mx-6 mb-2 rounded-md bg-mist/40 px-3 py-2 text-sm text-ink/70">
          {imported} transaction{Number(imported) !== 1 ? "s" : ""} imported
          {skipped ? `, ${skipped} skipped` : ""}.
        </p>
      )}

      <TransactionFilters
        categories={categories ?? []}
        q={q}
        category={category}
        date_from={date_from}
        date_to={date_to}
        type={type}
      />

      <p className="px-6 pb-4 font-body text-xs text-ink/40">
        {hasFilter ? `${count} result${count !== 1 ? "s" : ""}` : `${count} most recent`}
      </p>

      <div className="flex flex-col gap-6 px-6 pb-12">
        {byMonth.size === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/20">
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
                    {items?.map((t) => (
                      <a
                        key={t.id}
                        href={`/transactions/${t.id}/edit`}
                        className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-mist/30"
                      >
                        <CategoryBadge icon={t.categories?.icon} color={t.categories?.color} />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-body text-sm flex items-center gap-1.5">
                            {t.categories?.name ?? "Uncategorized"}
                            {t.is_recurring && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/30 shrink-0">
                                <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                              </svg>
                            )}
                          </span>
                          {t.note && <span className="font-body text-xs text-ink/50 truncate">{t.note}</span>}
                          {t.accounts?.name && <span className="font-body text-xs text-ink/40">{t.accounts.name}</span>}
                        </div>
                        <span className={`font-body tabular-nums text-sm shrink-0 ${t.amount > 0 ? "text-sage" : ""}`}>
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
