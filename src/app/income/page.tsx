import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { CategoryIcon } from "@/components/CategoryIcon";
import { isPlus } from "@/lib/subscription";
import { PlusGate } from "@/components/PlusGate";

function buildLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

function buildAreaPath(pts: { x: number; y: number }[], bottom: number): string {
  if (pts.length < 2) return "";
  const line = buildLinePath(pts);
  return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} L ${pts[0].x.toFixed(1)} ${bottom} Z`;
}

export default async function IncomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  if (!await isPlus(userData.user.id)) {
    return <PlusGate backHref="/settings" title="Income & savings" description="Track every income source and your savings rate month by month." />;
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  const since = sixMonthsAgo.toISOString().slice(0, 10);

  const { data: txns } = await supabase
    .from("transactions")
    .select("amount, occurred_at, category_id, categories(name, icon)")
    .gte("occurred_at", since)
    .order("occurred_at");

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  type MonthEntry = { income: number; expenses: number };
  const monthlyMap = new Map<string, MonthEntry>(months.map((mo) => [mo, { income: 0, expenses: 0 }]));
  const catMap = new Map<string, { name: string; icon: string | null; total: number }>();

  for (const t of txns ?? []) {
    const mo = t.occurred_at.slice(0, 7);
    if (!monthlyMap.has(mo)) continue;
    const entry = monthlyMap.get(mo)!;
    if (t.amount > 0) {
      entry.income += t.amount;
      const catKey = t.category_id ?? "__none__";
      const cats = t.categories && !Array.isArray(t.categories) ? t.categories : null;
      const prev = catMap.get(catKey);
      if (prev) {
        prev.total += t.amount;
      } else {
        catMap.set(catKey, { name: cats?.name ?? "Uncategorized", icon: cats?.icon ?? null, total: t.amount });
      }
    } else {
      entry.expenses += Math.abs(t.amount);
    }
  }

  const monthlyData = months.map((mo) => {
    const { income, expenses } = monthlyMap.get(mo)!;
    const saved = income - expenses;
    const rate = income > 0 ? Math.round((saved / income) * 100) : null;
    return { mo, income, expenses, saved, rate };
  });

  const monthsWithIncome = monthlyData.filter((m) => m.income > 0);
  const avgMonthlyIncome =
    monthsWithIncome.length > 0
      ? Math.round(monthsWithIncome.reduce((s, m) => s + m.income, 0) / monthsWithIncome.length)
      : 0;
  const ratesWithData = monthsWithIncome.filter((m) => m.rate !== null);
  const avgSavingsRate =
    ratesWithData.length > 0
      ? Math.round(ratesWithData.reduce((s, m) => s + m.rate!, 0) / ratesWithData.length)
      : null;

  const topCategories = [...catMap.values()].sort((a, b) => b.total - a.total).slice(0, 6);
  const totalCatIncome = topCategories.reduce((s, c) => s + c.total, 0);

  const W = 320, H = 80, PX = 16, PY = 10;
  const cW = W - 2 * PX, cH = H - 2 * PY;
  const n = monthlyData.length;
  const maxVal = Math.max(...monthlyData.map((m) => Math.max(m.income, m.expenses)), 1);

  const incomePts = monthlyData.map((d, i) => ({
    x: PX + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW),
    y: PY + cH - (d.income / maxVal) * cH,
  }));
  const expPts = monthlyData.map((d, i) => ({
    x: PX + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW),
    y: PY + cH - (d.expenses / maxVal) * cH,
  }));

  const incomeLine = buildLinePath(incomePts);
  const incomeArea = buildAreaPath(incomePts, PY + cH);
  const expLine = buildLinePath(expPts);

  const monthLabels = months.map((m) => {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString("en", { month: "short" });
  });

  const hasExpenses = monthlyData.some((m) => m.expenses > 0);
  const hasIncome = monthsWithIncome.length > 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-6">
        <a href="/settings" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
        <h1 className="font-display text-3xl">Income</h1>
      </header>

      {!hasIncome ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/20">
            <path d="M12 20V4M5 11l7-7 7 7" />
          </svg>
          <p className="font-body text-sm text-ink/40">No income recorded yet.</p>
          <p className="font-body text-xs text-ink/30 max-w-xs">
            Add transactions with a positive amount to track income and savings rate.
          </p>
          <a href="/transactions/new" className="font-body text-sm text-sage underline mt-2">
            Log income
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-6 pb-12">
          {/* KPI strip */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-2xl border border-mist bg-surface px-4 py-4">
              <p className="font-body text-[10px] uppercase tracking-widest text-ink/40">Avg / month</p>
              <p className="font-display tabular-nums text-2xl mt-1.5">{formatThb(avgMonthlyIncome)}</p>
            </div>
            {avgSavingsRate !== null && (
              <div className="flex-1 rounded-2xl border border-mist bg-surface px-4 py-4">
                <p className="font-body text-[10px] uppercase tracking-widest text-ink/40">Avg rate</p>
                <p
                  className="font-display tabular-nums text-2xl mt-1.5"
                  style={{
                    color:
                      avgSavingsRate >= 20
                        ? "var(--color-sage)"
                        : avgSavingsRate >= 0
                        ? "#9a8030"
                        : "var(--color-terracotta)",
                  }}
                >
                  {avgSavingsRate}%
                </p>
              </div>
            )}
          </div>

          {/* Income vs expenses chart */}
          <div className="rounded-2xl border border-mist bg-surface px-4 py-4">
            <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
              Income vs expenses
            </p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="income-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-sage)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--color-sage)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {incomeArea && <path d={incomeArea} fill="url(#income-grad)" />}
              {incomeLine && (
                <path
                  d={incomeLine}
                  fill="none"
                  stroke="var(--color-sage)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {expLine && hasExpenses && (
                <path
                  d={expLine}
                  fill="none"
                  stroke="var(--color-clay)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {incomePts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--color-sage)" />
              ))}
            </svg>
            <div className="flex justify-between mt-1" style={{ paddingLeft: `${PX}px`, paddingRight: `${PX}px` }}>
              {monthLabels.map((label, i) => (
                <span key={i} className="font-body text-[10px] text-ink/30">{label}</span>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 rounded-full" style={{ background: "var(--color-sage)" }} />
                <span className="font-body text-[10px] text-ink/50">Income</span>
              </div>
              {hasExpenses && (
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 rounded-full" style={{ background: "var(--color-clay)", opacity: 0.6 }} />
                  <span className="font-body text-[10px] text-ink/50">Expenses</span>
                </div>
              )}
            </div>
          </div>

          {/* Month-by-month table */}
          <div>
            <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">Month by month</p>
            <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
              {[...monthlyData].reverse().map(({ mo, income, expenses, saved, rate }) => {
                const [y, m] = mo.split("-");
                const label = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString("en", {
                  month: "long",
                  year: "numeric",
                });
                return (
                  <div key={mo} className="px-4 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-body text-sm">{label}</span>
                      {rate !== null && (
                        <span
                          className="font-body text-[11px] px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              rate >= 20 ? "var(--color-sage-soft)" : rate >= 0 ? "#f5f0da" : "#f5e0da",
                            color:
                              rate >= 20 ? "var(--color-sage)" : rate >= 0 ? "#9a8030" : "var(--color-terracotta)",
                          }}
                        >
                          {rate >= 0 ? `${rate}% saved` : `${Math.abs(rate)}% over`}
                        </span>
                      )}
                    </div>
                    {income > 0 ? (
                      <div className="flex gap-3 flex-wrap">
                        <span className="font-body text-xs tabular-nums" style={{ color: "var(--color-sage)" }}>
                          +{formatThb(income)}
                        </span>
                        {expenses > 0 && (
                          <span className="font-body text-xs tabular-nums text-ink/40">
                            −{formatThb(expenses)}
                          </span>
                        )}
                        {saved > 0 && (
                          <span className="font-body text-xs tabular-nums text-ink/50">
                            = {formatThb(saved)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-body text-xs text-ink/25">No income recorded</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Income sources */}
          {topCategories.length > 0 && (
            <div>
              <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
                Sources (6 months)
              </p>
              <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
                {topCategories.map(({ name, icon, total }) => {
                  const pct = totalCatIncome > 0 ? (total / totalCatIncome) * 100 : 0;
                  return (
                    <div key={name} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 font-body text-sm">
                          <CategoryIcon icon={icon} size={14} />
                          {name}
                        </span>
                        <span className="font-body text-sm tabular-nums text-ink/70">{formatThb(total)}</span>
                      </div>
                      <div
                        style={{
                          height: "3px",
                          borderRadius: "999px",
                          background: "var(--color-mist)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: "var(--color-sage)",
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
