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

  // Day-of-week spending (Mon=0 … Sun=6)
  const dowSpend = [0, 0, 0, 0, 0, 0, 0];
  for (const t of txns ?? []) {
    if (t.amount >= 0) continue;
    const dow = (new Date(t.occurred_at + "T12:00:00").getDay() + 6) % 7;
    dowSpend[dow] += Math.abs(t.amount);
  }
  const maxDow = Math.max(...dowSpend, 1);
  const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const peakDow = dowSpend.indexOf(Math.max(...dowSpend));

  // Per-month category spend for trend analysis
  const catByMonth: Record<string, number[]> = {};
  for (const t of txns ?? []) {
    if (t.amount >= 0) continue;
    const key = t.occurred_at.slice(0, 7) + "-01";
    const monthIdx = months.findIndex((mo) => mo.key === key);
    if (monthIdx === -1) continue;
    const name =
      (t.categories && !Array.isArray(t.categories)
        ? t.categories.name
        : null) ?? "Uncategorized";
    if (!catByMonth[name]) catByMonth[name] = [0, 0, 0, 0, 0, 0];
    catByMonth[name][monthIdx] = (catByMonth[name][monthIdx] ?? 0) + Math.abs(t.amount);
  }

  // Categories that rose 3 months in a row
  const trending = Object.entries(catByMonth)
    .filter(([_, amounts]) => {
      const [a, b, c] = amounts.slice(-3);
      return (a ?? 0) > 0 && (b ?? 0) > (a ?? 0) && (c ?? 0) > (b ?? 0);
    })
    .map(([name, amounts]) => ({
      name,
      prev: amounts[amounts.length - 2] ?? 0,
      curr: amounts[amounts.length - 1] ?? 0,
      icon: categoryMap[name]?.icon ?? null,
    }))
    .sort((a, b) => (b.curr - b.prev) - (a.curr - a.prev))
    .slice(0, 3);

  const hasDowData = dowSpend.some((v) => v > 0);

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

        {/* Patterns */}
        {(hasDowData || trending.length > 0) && (
          <section className="flex flex-col gap-6">
            <p className="font-body text-sm text-ink/60">Patterns</p>

            {hasDowData && (
              <div className="flex flex-col gap-3">
                <p className="font-body text-xs text-ink/40">Spending by day</p>
                <div className="flex items-end gap-1.5" style={{ height: "64px" }}>
                  {dowSpend.map((spend, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                      style={{ height: "100%" }}
                    >
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className={`w-full rounded-sm ${
                            i === peakDow ? "bg-clay/70" : "bg-ink/15"
                          }`}
                          style={{
                            height: `${Math.max(
                              spend > 0 ? 4 : 0,
                              (spend / maxDow) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`font-body text-[9px] leading-none ${
                          i === peakDow ? "text-clay" : "text-ink/30"
                        }`}
                      >
                        {DOW_LABELS[i]!.slice(0, 2)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="font-body text-xs text-ink/50">
                  Most spending on {DOW_LABELS[peakDow]}s.
                </p>
              </div>
            )}

            {trending.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="font-body text-xs text-ink/40">Rising 3 months in a row</p>
                <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
                  {trending.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <span className="font-body text-sm">
                        {[cat.icon, cat.name].filter(Boolean).join(" ")}
                      </span>
                      <span className="font-body text-xs tabular-nums text-ink/50">
                        {formatThb(cat.prev)} → {formatThb(cat.curr)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
