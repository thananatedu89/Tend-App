import { createClient } from "@/lib/supabase/server";
import { startOfMonth } from "@/lib/month";
import { formatThb } from "@/lib/format";

const shortMonth = new Intl.DateTimeFormat("en-GB", { month: "short" });
const longMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

export default async function InsightsPage() {
  const supabase = await createClient();

  const now = new Date();

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: startOfMonth(d),
      short: shortMonth.format(d),
      long: longMonth.format(d),
      spent: 0,
      income: 0,
    };
  });

  const monthMap = new Map(months.map((m) => [m.key, m]));

  const { data: txns } = await supabase
    .from("transactions")
    .select("amount, occurred_at, categories(name, icon)")
    .gte("occurred_at", months[0].key)
    .order("occurred_at", { ascending: true });

  const categoryMap: Record<string, { total: number; icon: string | null }> = {};

  for (const t of txns ?? []) {
    const key = t.occurred_at.slice(0, 7) + "-01";
    const m = monthMap.get(key);
    if (m) {
      if (t.amount < 0) m.spent += Math.abs(t.amount);
      else m.income += t.amount;
    }
    if (t.amount < 0) {
      const name =
        (t.categories && !Array.isArray(t.categories)
          ? t.categories.name
          : null) ?? "Uncategorized";
      const icon =
        t.categories && !Array.isArray(t.categories)
          ? t.categories.icon
          : null;
      if (!categoryMap[name]) categoryMap[name] = { total: 0, icon };
      categoryMap[name]!.total += Math.abs(t.amount);
    }
  }

  const maxSpent = Math.max(...months.map((m) => m.spent), 1);
  const maxIncome = Math.max(...months.map((m) => m.income), 1);
  const current = months[months.length - 1];
  const prev = months[months.length - 2];
  const delta = current.spent - prev.spent;

  const categories = Object.entries(categoryMap)
    .map(([name, v]) => ({ name, total: v.total, icon: v.icon }))
    .sort((a, b) => b.total - a.total);
  const maxCategory = categories[0]?.total ?? 1;

  const hasIncome = months.some((m) => m.income > 0);

  const deltaText =
    prev.spent === 0
      ? null
      : delta === 0
      ? "Same as last month."
      : delta > 0
      ? `Up ${formatThb(delta)} from ${prev.long}.`
      : `Down ${formatThb(Math.abs(delta))} from ${prev.long}.`;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <a
          href="/"
          className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
        >
          ←
        </a>
        <h1 className="font-display text-lg">Insights</h1>
      </header>

      <div className="flex flex-col gap-10 px-6 pb-12">
        {/* Monthly spend trend */}
        <section className="flex flex-col gap-4">
          <p className="font-body text-sm text-ink/60">Monthly spending</p>
          <div className="flex items-end gap-2" style={{ height: "96px" }}>
            {months.map((m) => (
              <div
                key={m.key}
                className="flex-1 flex flex-col items-center gap-1.5"
                style={{ height: "100%" }}
              >
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-sm transition-all ${
                      m.key === current.key ? "bg-ink/50" : "bg-ink/20"
                    }`}
                    style={{
                      height: `${Math.max(2, (m.spent / maxSpent) * 100)}%`,
                    }}
                  />
                </div>
                <span className="font-body text-[10px] text-ink/40 leading-none">
                  {m.short}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Monthly income trend */}
        {hasIncome && (
          <section className="flex flex-col gap-4">
            <p className="font-body text-sm text-ink/60">Monthly income</p>
            <div className="flex items-end gap-2" style={{ height: "96px" }}>
              {months.map((m) => (
                <div
                  key={m.key}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  style={{ height: "100%" }}
                >
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-sm transition-all ${
                        m.key === current.key ? "bg-sage/70" : "bg-sage/30"
                      }`}
                      style={{
                        height: `${Math.max(m.income > 0 ? 2 : 0, (m.income / maxIncome) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="font-body text-[10px] text-ink/40 leading-none">
                    {m.short}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Month-over-month */}
        <section className="flex flex-col gap-3">
          <p className="font-body text-sm text-ink/60">Month over month</p>
          <div className="flex gap-8">
            <div className="flex flex-col gap-0.5">
              <span className="font-body text-xs text-ink/40">{prev.long}</span>
              <span className="font-display text-2xl tabular-nums">
                {formatThb(prev.spent)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-body text-xs text-ink/40">
                {current.long}
              </span>
              <span className="font-display text-2xl tabular-nums">
                {formatThb(current.spent)}
              </span>
            </div>
          </div>
          {deltaText && (
            <p className="font-body text-sm text-ink/60">{deltaText}</p>
          )}
          {hasIncome && current.income > 0 && (
            <p className="font-body text-sm text-ink/60">
              Income this month: {formatThb(current.income)}
              {current.income > current.spent
                ? ` · ${formatThb(current.income - current.spent)} saved.`
                : current.income > 0
                ? ` · ${formatThb(current.spent - current.income)} over income.`
                : ""}
            </p>
          )}
        </section>

        {/* Top categories — 6-month view */}
        {categories.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="font-body text-sm text-ink/60">
              Top categories, 6 months
            </p>
            <div className="flex flex-col gap-2">
              {categories.slice(0, 8).map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="font-body text-xs text-ink/50 w-28 text-right truncate">
                    {[cat.icon, cat.name].filter(Boolean).join(" ")}
                  </span>
                  <div className="flex-1 h-1 bg-mist rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink/40 rounded-full"
                      style={{ width: `${(cat.total / maxCategory) * 100}%` }}
                    />
                  </div>
                  <span className="font-body text-xs tabular-nums text-ink/50 w-20 text-right">
                    {formatThb(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {categories.length === 0 && (
          <p className="font-body text-sm text-ink/60 text-center pt-4">
            No transactions in the last 6 months.
          </p>
        )}
      </div>
    </main>
  );
}
