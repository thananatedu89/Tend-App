import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import {
  startOfMonth,
  monthProgress,
  parseMonthParam,
  prevMonthParam,
  nextMonthParam,
  isCurrentMonth,
} from "@/lib/month";
import { paceSignal, forecastLine, healthScore } from "@/lib/signal";
import { getSubscriptions } from "@/lib/bills";
import { CategoryIcon, CategoryBadge } from "@/components/CategoryIcon";

const monthHeading = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

// "Monday, 23 June" — matches the exploration's date style
const heroDateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function daysLeftInMonth(now: Date): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return last.getDate() - now.getDate();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const monthDate = parseMonthParam(monthParam);
  const monthStart = startOfMonth(monthDate);
  const viewing = isCurrentMonth(monthDate);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  // Week bounds for the digest card
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [
    { count: totalCount },
    { data: transactions },
    { data: budget },
    { data: weekTxns },
    { data: goals },
    { data: histTxns },
    { data: recurringTxns },
  ] = await Promise.all([
    supabase.from("transactions").select("*", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("id, amount, note, occurred_at, category_id, categories(name, icon, color)")
      .gte("occurred_at", monthStart)
      .lt("occurred_at", nextMonthParam(monthDate))
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("budgets")
      .select("id, total_amount, budget_lines(category_id, allocated_amount)")
      .eq("month", monthStart)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("amount")
      .lt("amount", 0)
      .gte("occurred_at", weekStartStr),
    supabase
      .from("goals")
      .select("id, name, target_amount, saved_amount")
      .order("created_at", { ascending: true })
      .limit(3),
    supabase
      .from("transactions")
      .select("category_id, amount, occurred_at, categories(name, icon, color)")
      .lt("amount", 0)
      .gte("occurred_at", (() => { const d = new Date(now.getFullYear(), now.getMonth() - 3, 1); return d.toISOString().slice(0, 10); })())
      .lt("occurred_at", monthStart),
    supabase
      .from("transactions")
      .select("id, amount, note, category_id, occurred_at, is_recurring, categories(name)")
      .lt("amount", 0)
      .gte("occurred_at", (() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10); })())
      .order("occurred_at", { ascending: false }),
  ]);

  const isNewUser = (totalCount ?? 0) === 0;

  const spentThisMonth = (transactions ?? [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const incomeThisMonth = (transactions ?? [])
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const savedThisMonth = incomeThisMonth - spentThisMonth;
  const savingsRate = incomeThisMonth > 0 ? (savedThisMonth / incomeThisMonth) * 100 : 0;

  const leftToSpend = budget ? budget.total_amount - spentThisMonth : null;

  const weekSpend = (weekTxns ?? []).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Spending forecast
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const forecast = viewing && !isNewUser
    ? forecastLine(spentThisMonth, daysElapsed, daysInMonth, budget?.total_amount ?? null)
    : null;

  // Category spending breakdown for chart
  const spentByCategory = new Map<string, { name: string; icon: string | null; amount: number }>();
  for (const t of transactions ?? []) {
    if (t.amount >= 0) continue;
    const key = t.category_id ?? "__none__";
    const existing = spentByCategory.get(key);
    spentByCategory.set(key, {
      name: t.categories?.name ?? "Uncategorized",
      icon: t.categories?.icon ?? null,
      amount: (existing?.amount ?? 0) + Math.abs(t.amount),
    });
  }
  const categoryChart = [...spentByCategory.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Category anomaly detection — compare current month to 3-month average
  interface AnomalyItem { name: string; icon: string | null; color: string | null; current: number; avg: number }
  const anomalies: AnomalyItem[] = [];
  if (viewing && !isNewUser && daysElapsed >= 5 && histTxns && histTxns.length > 0) {
    // Aggregate historical spend per category per month
    const histByMonthCat = new Map<string, Map<string, number>>();
    for (const t of histTxns) {
      if (!t.category_id) continue;
      const mo = t.occurred_at.slice(0, 7);
      if (!histByMonthCat.has(mo)) histByMonthCat.set(mo, new Map());
      const m = histByMonthCat.get(mo)!;
      m.set(t.category_id, (m.get(t.category_id) ?? 0) + Math.abs(t.amount));
    }
    // Average per category across months that had spend
    const histAvgByCat = new Map<string, { avg: number; name: string; icon: string | null; color: string | null }>();
    const allCatIds = new Set([...histTxns.map((t) => t.category_id).filter(Boolean) as string[]]);
    for (const catId of allCatIds) {
      let total = 0; let months = 0;
      let name = ""; let icon: string | null = null; let color: string | null = null;
      for (const [, catMap] of histByMonthCat) {
        if (catMap.has(catId)) { total += catMap.get(catId)!; months++; }
      }
      const sample = histTxns.find((t) => t.category_id === catId);
      name = sample?.categories?.name ?? "Uncategorized";
      icon = sample?.categories?.icon ?? null;
      color = sample?.categories?.color ?? null;
      if (months > 0) histAvgByCat.set(catId, { avg: total / months, name, icon, color });
    }
    // Find anomalies in current month
    for (const [catId, entry] of spentByCategory) {
      const hist = histAvgByCat.get(catId);
      if (!hist || hist.avg < 200) continue;
      const ratio = entry.amount / hist.avg;
      if (ratio >= 1.5 && entry.amount - hist.avg > 500) {
        anomalies.push({ name: entry.name, icon: entry.icon, color: null, current: entry.amount, avg: hist.avg });
      }
    }
    anomalies.sort((a, b) => (b.current / b.avg) - (a.current / a.avg));
  }

  // Missed recurrings
  interface MissedItem {
    id: string;
    amount: number;
    note: string | null;
    categoryId: string | null;
    categoryName: string;
    icon: string | null;
  }
  let missedRecurrings: MissedItem[] = [];
  const dayOfMonth = new Date().getDate();

  if (viewing && dayOfMonth >= 5 && !isNewUser) {
    const since90 = new Date();
    since90.setDate(since90.getDate() - 90);
    const since90Str = since90.toISOString().slice(0, 10);

    const { data: hist } = await supabase
      .from("transactions")
      .select("id, amount, note, category_id, categories(name, icon), occurred_at")
      .lt("amount", 0)
      .gte("occurred_at", since90Str)
      .lt("occurred_at", monthStart);

    const groups = new Map<string, MissedItem & { count: number }>();
    for (const t of hist ?? []) {
      const key = `${t.category_id ?? ""}|${t.note ?? ""}|${t.amount}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
      } else {
        const catObj =
          t.categories && !Array.isArray(t.categories) ? t.categories : null;
        groups.set(key, {
          id: t.id,
          count: 1,
          amount: t.amount,
          note: t.note,
          categoryId: t.category_id,
          categoryName: catObj?.name ?? "Uncategorized",
          icon: catObj?.icon ?? null,
        });
      }
    }

    const thisMonthKeys = new Set(
      (transactions ?? [])
        .filter((t) => t.amount < 0)
        .map((t) => `${t.category_id ?? ""}|${t.note ?? ""}|${t.amount}`),
    );

    missedRecurrings = [...groups.values()]
      .filter((g) => {
        const k = `${g.categoryId ?? ""}|${g.note ?? ""}|${g.amount}`;
        return g.count >= 2 && !thisMonthKeys.has(k);
      })
      .slice(0, 3);
  }

  // Spending streak — consecutive days at or under daily budget
  let streak = 0;
  if (viewing && !isNewUser && budget) {
    const dailyBudget = budget.total_amount / daysInMonth;
    // Group spending by date
    const spentByDate = new Map<string, number>();
    for (const t of transactions ?? []) {
      if (t.amount >= 0) continue;
      const day = t.occurred_at.slice(0, 10);
      spentByDate.set(day, (spentByDate.get(day) ?? 0) + Math.abs(t.amount));
    }
    // Walk back from yesterday counting streak days
    const check = new Date(now);
    check.setDate(check.getDate() - 1);
    for (let i = 0; i < daysElapsed - 1; i++) {
      const key = check.toISOString().slice(0, 10);
      const daySpend = spentByDate.get(key) ?? 0;
      if (daySpend <= dailyBudget) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Financial health score
  const health = viewing && !isNewUser
    ? healthScore({
        budget: budget?.total_amount ?? null,
        spentThisMonth,
        daysElapsed,
        daysInMonth,
        goalCount: (goals ?? []).length,
        goalsWithSavings: (goals ?? []).filter((g) => g.saved_amount > 0).length,
        streak,
      })
    : null;

  // Upcoming bills — pattern-detected + flagged recurring, due in next 7 days
  const upcomingBills = viewing && !isNewUser
    ? getSubscriptions(
        (recurringTxns ?? []).map((t) => ({
          ...t,
          categories: t.categories && !Array.isArray(t.categories) ? t.categories : null,
        })),
      ).filter((s) => s.daysUntil >= 0 && s.daysUntil <= 7)
    : [];

  // 4 most recent transactions for the activity preview
  const recentFour = (transactions ?? []).slice(0, 4);

  const daysLeft = daysLeftInMonth(now);
  const dailyAllowance =
    leftToSpend !== null && leftToSpend > 0 && daysLeft > 0
      ? leftToSpend / daysLeft
      : null;

  return (
    <main className="flex flex-1 flex-col">
      {isNewUser ? (
        /* Empty / first-run state */
        <div className="flex flex-1 flex-col justify-between px-6 pt-14 pb-10">
          <div className="flex flex-col gap-2">
            <p
              style={{ fontSize: "12px", fontWeight: 500, letterSpacing: ".05em", color: "var(--color-ink)" }}
              className="opacity-40"
            >
              {heroDateFmt.format(now)}
            </p>
            <h1
              className="font-display"
              style={{ fontSize: "22px", fontWeight: 500, color: "var(--color-ink)", marginTop: "2px" }}
            >
              {greeting()}
            </h1>
            <p className="font-body text-sm text-ink/60 mt-6 max-w-xs">
              Add your first transaction to get a clear picture of where you stand.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="/transactions/new"
              className="font-body w-full rounded-full bg-ink text-paper text-center transition-opacity hover:opacity-90"
              style={{ padding: "15px", fontSize: "15px", fontWeight: 500 }}
            >
              Add your first amount
            </a>
            <a href="/budget" className="font-body text-center text-sage" style={{ fontSize: "14px", fontWeight: 500 }}>
              Set a monthly budget first
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Month nav — only shown when browsing past months */}
          {!viewing && (
            <div className="flex items-center justify-center gap-4 px-6 pt-4">
              <a href={`/?month=${prevMonthParam(monthDate)}`} className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
              <span className="font-body text-sm text-ink/60 w-36 text-center">{monthHeading.format(monthDate)}</span>
              <a href={`/?month=${nextMonthParam(monthDate)}`} className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">→</a>
            </div>
          )}

          {/* The Single Number — Option A Editorial */}
          <div className="px-6 pt-9 pb-8">
            {/* Date + greeting */}
            <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-ink)" }} className="opacity-40">
              {heroDateFmt.format(now)}
            </p>
            <p
              className="font-display"
              style={{ fontSize: "22px", fontWeight: 500, color: "var(--color-ink)", marginTop: "2px", marginBottom: viewing ? "34px" : "16px" }}
            >
              {greeting()}
            </p>

            {/* Eyebrow */}
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-ink)", opacity: 0.4 }}>
              {budget
                ? viewing ? "Left to spend this month" : `Left to spend · ${monthHeading.format(monthDate)}`
                : viewing ? "Spent this month" : `Spent · ${monthHeading.format(monthDate)}`}
            </p>

            {/* Hero number */}
            <p
              className="font-display tabular-nums"
              style={{ fontSize: "48px", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.02, margin: "9px 0 12px" }}
            >
              {formatThb(leftToSpend ?? spentThisMonth)}
            </p>

            {/* Calm status line */}
            {budget && viewing && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <p style={{ fontSize: "14.5px", lineHeight: 1.55, color: "var(--color-ink)", opacity: 0.55 }}>
                  {paceSignal(spentThisMonth, budget.total_amount, monthProgress())}
                </p>
                {dailyAllowance !== null && (
                  <p style={{ fontSize: "13px", color: "var(--color-ink)", opacity: 0.4 }}>
                    ~{formatThb(dailyAllowance)} / day for {daysLeft} more day{daysLeft !== 1 ? "s" : ""}
                  </p>
                )}
                {forecast && (
                  <p style={{ fontSize: "13px", color: "var(--color-ink)", opacity: 0.35 }}>
                    {forecast}
                  </p>
                )}
                {streak >= 2 && (
                  <p style={{ fontSize: "13px", color: "var(--color-sage)", opacity: 0.8 }}>
                    {streak}-day streak under daily budget.
                  </p>
                )}
              </div>
            )}
            {!budget && viewing && forecast && (
              <p style={{ fontSize: "13px", color: "var(--color-ink)", opacity: 0.4, marginTop: "4px" }}>
                {forecast}
              </p>
            )}
            {!budget && viewing && (
              <a href="/budget" className="font-body text-sage" style={{ fontSize: "14.5px" }}>
                Set a budget for this month →
              </a>
            )}

            {/* Progress bar + metadata */}
            {budget && (
              <div className="mt-6">
                <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-mist)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, (spentThisMonth / budget.total_amount) * 100)}%`,
                      height: "100%",
                      background: "var(--color-sage)",
                      borderRadius: "999px",
                      transition: "width .3s ease",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2" style={{ fontSize: "12px", color: "var(--color-ink)", opacity: 0.4 }}>
                  <span className="tabular-nums">{formatThb(spentThisMonth)} spent</span>
                  {viewing && <span>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>}
                </div>
              </div>
            )}

            {/* Past month navigation */}
            {viewing && (
              <a
                href={`/?month=${prevMonthParam(monthDate)}`}
                className="font-body text-ink/40 hover:text-ink/60 transition-colors mt-4 inline-block"
                style={{ fontSize: "12px" }}
              >
                ← View last month
              </a>
            )}
          </div>

          {/* Financial health score */}
          {health && (
            <div className="px-6 pb-6">
              <div className="rounded-2xl border border-mist bg-surface px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-body text-xs uppercase tracking-widest text-ink/40">Health score</p>
                  <span
                    className="font-body text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: health.score >= 65 ? "var(--color-sage-soft)" : health.score >= 45 ? "#f5f0da" : "#f5e0da",
                      color: health.score >= 65 ? "var(--color-sage)" : health.score >= 45 ? "#9a8030" : "var(--color-terracotta)",
                    }}
                  >
                    {health.label}
                  </span>
                </div>
                <div className="flex items-end gap-3 mb-3">
                  <p className="font-display tabular-nums" style={{ fontSize: "40px", lineHeight: 1, fontWeight: 500 }}>
                    {health.score}
                  </p>
                  <p className="font-body text-sm text-ink/40 mb-1">/ 100</p>
                </div>
                <div style={{ height: "4px", borderRadius: "999px", background: "var(--color-mist)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${health.score}%`,
                      height: "100%",
                      borderRadius: "999px",
                      transition: "width .4s ease",
                      background: health.score >= 65 ? "var(--color-sage)" : health.score >= 45 ? "#c4a040" : "var(--color-terracotta)",
                    }}
                  />
                </div>
                {/* Score breakdown */}
                <div className="mt-4 flex flex-col gap-1.5">
                  {[
                    { label: "Budget", pts: health.breakdown.budget, max: 40 },
                    { label: "Pace", pts: health.breakdown.pace, max: 20 },
                    { label: "Goals", pts: health.breakdown.goals, max: 30 },
                    { label: "Streak", pts: health.breakdown.streak, max: 10 },
                  ].map(({ label, pts, max }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="font-body text-xs text-ink/40 w-12">{label}</span>
                      <div className="flex-1 h-1 bg-mist rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-ink/25" style={{ width: `${(pts / max) * 100}%` }} />
                      </div>
                      <span className="font-body text-xs tabular-nums text-ink/40 w-8 text-right">{pts}/{max}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Savings rate card */}
          {viewing && !isNewUser && incomeThisMonth > 0 && (
            <div className="px-6 pb-6">
              <div className="rounded-2xl border border-mist bg-surface px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-body text-xs uppercase tracking-widest text-ink/40">Savings rate</p>
                  <a href="/income" className="font-body text-xs text-ink/40 hover:text-ink/70 transition-colors">History →</a>
                </div>
                <div className="flex items-end gap-3 mb-3">
                  <p
                    className="font-display tabular-nums"
                    style={{
                      fontSize: "40px",
                      lineHeight: 1,
                      fontWeight: 500,
                      color:
                        savingsRate >= 20
                          ? "var(--color-sage)"
                          : savingsRate >= 0
                          ? "#9a8030"
                          : "var(--color-terracotta)",
                    }}
                  >
                    {Math.round(savingsRate)}%
                  </p>
                  {savedThisMonth > 0 && (
                    <p className="font-body text-sm text-ink/40 mb-1">
                      {formatThb(Math.round(savedThisMonth))} saved
                    </p>
                  )}
                </div>
                <div
                  style={{
                    height: "4px",
                    borderRadius: "999px",
                    background: "var(--color-mist)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, savingsRate))}%`,
                      height: "100%",
                      borderRadius: "999px",
                      transition: "width .4s ease",
                      background:
                        savingsRate >= 20
                          ? "var(--color-sage)"
                          : savingsRate >= 0
                          ? "#c4a040"
                          : "var(--color-terracotta)",
                    }}
                  />
                </div>
                <p className="font-body text-xs text-ink/40 mt-2">
                  {savingsRate >= 20
                    ? "Solid savings pace."
                    : savingsRate >= 0
                    ? "Saving a little — keep it up."
                    : "Expenses exceed income this month."}
                </p>
              </div>
            </div>
          )}

          {/* Weekly snapshot link */}
          {viewing && !isNewUser && (
            <div className="px-6 pb-6">
              <a
                href="/week"
                className="flex items-center justify-between rounded-2xl border border-mist bg-surface px-5 py-4 hover:bg-mist/20 transition-colors"
              >
                <p className="font-body text-sm text-ink/70">This week</p>
                <span className="font-body text-xs text-ink/40">View →</span>
              </a>
            </div>
          )}

          {/* Missed recurrings */}
          {missedRecurrings.length > 0 && (
            <div className="flex flex-col gap-2 px-6 pb-6">
              <p className="font-body text-xs text-ink/40">Not recorded yet this month</p>
              <div className="flex flex-wrap gap-2">
                {missedRecurrings.map((item) => (
                  <a
                    key={item.id}
                    href={`/transactions/new?from=${item.id}`}
                    className="font-body text-xs rounded-full border border-mist px-3 py-1.5 text-ink/60 hover:bg-mist/40 transition-colors inline-flex items-center gap-1"
                  >
                    <CategoryIcon icon={item.icon} size={12} />
                    {item.categoryName}
                    {item.note ? ` · ${item.note}` : ""}
                    {" · "}
                    {formatThb(Math.abs(item.amount))}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming bills */}
          {upcomingBills.length > 0 && (
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="font-body text-xs uppercase tracking-widest text-ink/40">Coming up</p>
                <a href="/subscriptions" className="font-body text-xs text-ink/40 hover:text-ink/70 transition-colors">View all →</a>
              </div>
              <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
                {upcomingBills.map((bill) => (
                  <a
                    key={`${bill.label}-${bill.dueDay}`}
                    href={`/transactions/new?from=${bill.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
                  >
                    <div>
                      <p className="font-body text-sm">{bill.label}</p>
                      <p className="font-body text-xs text-ink/40 mt-0.5">
                        {bill.daysUntil === 0
                          ? "Due today"
                          : bill.daysUntil === 1
                          ? "Due tomorrow"
                          : `Due in ${bill.daysUntil} days`}
                      </p>
                    </div>
                    <span className="font-body text-sm tabular-nums text-ink/60">
                      {formatThb(bill.amount)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className="flex flex-col gap-3 px-6 pb-6">
            <div className="flex items-center justify-between">
              <p className="font-body text-xs uppercase tracking-widest text-ink/40">
                Recent
              </p>
              <a href="/transactions" className="font-body text-xs text-sage">
                See all →
              </a>
            </div>

            {recentFour.length === 0 ? (
              <p className="font-body text-sm text-ink/60 text-center py-4">
                Nothing recorded yet this month.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
                {recentFour.map((t) => (
                  <a
                    key={t.id}
                    href={`/transactions/${t.id}/edit`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-mist/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryBadge icon={t.categories?.icon} color={t.categories?.color} size={15} />
                      <div className="flex flex-col">
                        <span className="font-body text-sm">
                          {t.categories?.name ?? "Uncategorized"}
                        </span>
                        {t.note && (
                          <span className="font-body text-xs text-ink/50">{t.note}</span>
                        )}
                        <span className="font-body text-xs text-ink/40">
                          {dayFmt.format(new Date(t.occurred_at + "T12:00:00"))}
                        </span>
                      </div>
                    </div>
                    <span className={`font-body tabular-nums text-sm ${t.amount > 0 ? "text-sage" : ""}`}>
                      {t.amount < 0 ? "−" : "+"}
                      {formatThb(Math.abs(t.amount))}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Spending breakdown chart */}
          {viewing && categoryChart.length > 0 && (
            <div className="px-6 pb-6">
              <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
                Spending this month
              </p>
              <div className="rounded-2xl border border-mist bg-surface px-5 py-4">
                {categoryChart.map(({ name, icon, amount }, i) => {
                  const pct = spentThisMonth > 0 ? (amount / spentThisMonth) * 100 : 0;
                  return (
                    <div
                      key={name}
                      style={{
                        paddingTop: i === 0 ? 0 : "10px",
                        paddingBottom: i === categoryChart.length - 1 ? 0 : "10px",
                        borderBottom: i < categoryChart.length - 1 ? "1px solid var(--color-mist)" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5" style={{ fontSize: "13px" }}>
                        <span className="flex items-center gap-2 text-ink">
                          <CategoryIcon icon={icon} size={13} />
                          {name}
                        </span>
                        <span className="tabular-nums text-ink/60">{formatThb(amount)}</span>
                      </div>
                      <div style={{ height: "3px", borderRadius: "999px", background: "var(--color-mist)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-sage)", borderRadius: "999px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Anomaly alerts */}
          {viewing && anomalies.length > 0 && (
            <div className="px-6 pb-6">
              <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">Heads up</p>
              <div className="flex flex-col gap-2">
                {anomalies.slice(0, 2).map((a) => (
                  <div key={a.name} className="rounded-2xl border px-4 py-3.5" style={{ borderColor: "var(--color-clay)", background: "var(--color-paper)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-body text-sm">{a.name} is running high</p>
                        <p className="font-body text-xs mt-0.5" style={{ color: "var(--color-ink)", opacity: 0.45 }}>
                          {formatThb(a.current)} this month vs. {formatThb(Math.round(a.avg))} avg
                        </p>
                      </div>
                      <span className="font-body text-xs tabular-nums shrink-0 mt-0.5" style={{ color: "var(--color-clay)" }}>
                        +{Math.round((a.current / a.avg - 1) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goals preview */}
          {viewing && goals && goals.length > 0 && (
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="font-body text-xs uppercase tracking-widest text-ink/40">Goals</p>
                <a href="/goals" className="font-body text-xs text-sage">See all →</a>
              </div>
              <div className="flex flex-col gap-2">
                {goals.map((goal) => {
                  const pct = goal.target_amount > 0
                    ? Math.min(100, (goal.saved_amount / goal.target_amount) * 100)
                    : 0;
                  const done = goal.saved_amount >= goal.target_amount;
                  return (
                    <a
                      key={goal.id}
                      href={`/goals/${goal.id}`}
                      className="block rounded-2xl border border-mist bg-surface px-4 py-3.5 hover:bg-mist/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-body text-sm">{goal.name}</span>
                        <span className="font-body text-xs tabular-nums" style={{ color: done ? "var(--color-sage)" : "var(--color-ink)", opacity: done ? 1 : 0.4 }}>
                          {done ? "Reached" : `${formatThb(goal.saved_amount)} / ${formatThb(goal.target_amount)}`}
                        </span>
                      </div>
                      <div style={{ height: "4px", borderRadius: "999px", background: "var(--color-mist)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-sage)", borderRadius: "999px" }} />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* This week digest card */}
          {viewing && (
            <div className="px-6 pb-10">
              <a
                href="/digest"
                className="block rounded-2xl border border-mist bg-surface px-5 py-4 hover:bg-mist/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-body text-xs uppercase tracking-widest text-ink/40">
                    This week
                  </p>
                  <span className="font-body text-xs text-sage">View →</span>
                </div>
                <p className="font-display text-2xl tabular-nums">
                  {formatThb(weekSpend)}
                </p>
                <p className="font-body text-xs text-ink/50 mt-1">
                  spent so far this week
                </p>
              </a>
            </div>
          )}
        </>
      )}
    </main>
  );
}
