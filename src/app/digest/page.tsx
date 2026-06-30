import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { startOfMonth } from "@/lib/month";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  startOfWeek,
  parseWeekParam,
  prevWeekParam,
  nextWeekParam,
  weekEndDate,
  weekDateStr,
  isCurrentWeek,
} from "@/lib/week";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default async function DigestPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const weekStart = parseWeekParam(weekParam);
  const weekEnd = weekEndDate(weekStart);
  const isCurrent = isCurrentWeek(weekStart);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Current week transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, category_id, categories(name, icon)")
    .gte("occurred_at", weekDateStr(weekStart))
    .lte("occurred_at", weekDateStr(weekEnd));

  // Prior week total
  const prevWeekStart = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() - 7,
  );
  const prevWeekEnd = weekEndDate(prevWeekStart);

  const { data: prevWeekTxns } = await supabase
    .from("transactions")
    .select("amount")
    .gte("occurred_at", weekDateStr(prevWeekStart))
    .lte("occurred_at", weekDateStr(prevWeekEnd))
    .lt("amount", 0);

  const prevWeekTotal = (prevWeekTxns ?? []).reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0,
  );

  // Monthly budget pace (current week only)
  let monthlyBudget: number | null = null;
  let monthSpent = 0;
  if (isCurrent) {
    const monthStart = startOfMonth();
    const [{ data: budgetRow }, { data: monthTxns }] = await Promise.all([
      supabase
        .from("budgets")
        .select("total_amount")
        .eq("month", monthStart)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("amount")
        .gte("occurred_at", monthStart)
        .lt("amount", 0),
    ]);
    monthlyBudget = budgetRow?.total_amount ?? null;
    monthSpent = (monthTxns ?? []).reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0,
    );
  }

  // Aggregate current week
  const spentByCategory = new Map<string, { name: string; icon: string | null; amount: number }>();
  let totalSpent = 0;
  let totalIncome = 0;

  for (const t of transactions ?? []) {
    if (t.amount < 0) {
      totalSpent += Math.abs(t.amount);
      const key = t.category_id ?? "__none__";
      const name = t.categories?.name ?? "Uncategorized";
      const icon = t.categories?.icon ?? null;
      const existing = spentByCategory.get(key);
      spentByCategory.set(key, {
        name,
        icon,
        amount: (existing?.amount ?? 0) + Math.abs(t.amount),
      });
    } else {
      totalIncome += t.amount;
    }
  }

  const categoryRows = [...spentByCategory.values()].sort(
    (a, b) => b.amount - a.amount,
  );

  // Week-over-week copy
  const weekDelta = totalSpent - prevWeekTotal;
  let weekCompare: string | null = null;
  if (prevWeekTotal > 0) {
    if (Math.abs(weekDelta) < 50) weekCompare = "About the same as last week.";
    else if (weekDelta < 0)
      weekCompare = `${formatThb(Math.abs(weekDelta))} less than last week.`;
    else weekCompare = `${formatThb(weekDelta)} more than last week.`;
  }

  // Budget pace copy
  let paceText: string | null = null;
  if (isCurrent && monthlyBudget) {
    const now = new Date();
    const daysElapsed = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expected = (daysElapsed / daysInMonth) * monthlyBudget;
    const delta = expected - monthSpent;
    if (Math.abs(delta) < 200) paceText = "On pace for the month.";
    else if (delta > 0) paceText = `${formatThb(delta)} under monthly pace.`;
    else paceText = `${formatThb(Math.abs(delta))} over monthly pace.`;
  }

  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekLabel = sameMonth
    ? `${weekStart.getDate()}–${dateFmt.format(weekEnd)}`
    : `${dateFmt.format(weekStart)} – ${dateFmt.format(weekEnd)}`;

  return (
    <main className="flex flex-1 flex-col px-6 pt-10 pb-12">
      <div className="w-full max-w-sm mx-auto">

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-10">
          <a href={`/digest?week=${prevWeekParam(weekStart)}`} className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
          <span className="font-body text-sm text-ink/60">
            {isCurrent ? "This week" : weekLabel}
          </span>
          {isCurrent ? (
            <span className="w-6" />
          ) : (
            <a href={`/digest?week=${nextWeekParam(weekStart)}`} className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">→</a>
          )}
        </div>

        {/* Option B — Figure & notes */}
        <div style={{ marginBottom: "24px" }}>
          {/* Eyebrow */}
          <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-sage)", marginBottom: "10px" }}>
            Your week{!isCurrent ? ` · ${weekLabel}` : ""}
          </p>

          {/* Hero number */}
          <p
            className="font-display tabular-nums"
            style={{ fontSize: "46px", fontWeight: 500, letterSpacing: "-.025em", lineHeight: 1, color: "var(--color-ink)" }}
          >
            {formatThb(totalSpent)}
          </p>

          {/* Calm comparison line */}
          {weekCompare && (
            <p style={{ fontSize: "14.5px", color: "var(--color-ink)", opacity: 0.55, marginTop: "10px" }}>
              {weekCompare}
            </p>
          )}
          {paceText && !weekCompare && (
            <p style={{ fontSize: "14.5px", color: "var(--color-ink)", opacity: 0.55, marginTop: "10px" }}>
              {paceText}
            </p>
          )}
        </div>

        {/* Category chart */}
        {categoryRows.length > 0 ? (
          <div>
            {categoryRows.map(({ name, icon, amount }, i) => {
              const barPct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
              return (
                <div
                  key={name}
                  style={{
                    padding: "12px 0",
                    borderBottom: i < categoryRows.length - 1 ? "1px solid var(--color-mist)" : "none",
                  }}
                >
                  {/* Label row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px", fontSize: "14px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-ink)" }}>
                      <CategoryIcon icon={icon} size={14} />
                      {name}
                    </span>
                    <span className="tabular-nums" style={{ color: "var(--color-ink)" }}>
                      {formatThb(amount)}
                    </span>
                  </div>
                  {/* Bar */}
                  <div style={{ height: "4px", borderRadius: "999px", background: "var(--color-mist)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${barPct}%`,
                        height: "100%",
                        background: "var(--color-sage)",
                        borderRadius: "999px",
                      }}
                    />
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--color-ink)", opacity: 0.35, marginTop: "4px" }}>
                    {Math.round(barPct)}%
                  </p>
                </div>
              );
            })}
            {totalIncome > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--color-mist)", fontSize: "14px", marginTop: "4px" }}>
                <span style={{ color: "var(--color-sage)" }}>Income</span>
                <span className="tabular-nums" style={{ color: "var(--color-sage)" }}>+{formatThb(totalIncome)}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="font-body text-center text-sm text-ink/60 py-6">
            Nothing recorded this week.
          </p>
        )}

        <a
          href="/"
          className="font-body mt-8 block text-center text-sm text-sage underline"
        >
          Back to overview
        </a>
      </div>
    </main>
  );
}
