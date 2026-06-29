import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { startOfMonth } from "@/lib/month";
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
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-4 mb-8">
          <a
            href={`/digest?week=${prevWeekParam(weekStart)}`}
            className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
          >
            ←
          </a>
          <span className="font-body text-sm text-ink/60 w-44 text-center">
            {isCurrent ? "This week" : `Week of ${weekLabel}`}
          </span>
          {isCurrent ? (
            <span className="w-6" />
          ) : (
            <a
              href={`/digest?week=${nextWeekParam(weekStart)}`}
              className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
            >
              →
            </a>
          )}
        </div>

        <div className="flex flex-col items-center text-center gap-2 mb-10">
          <p className="font-body text-sm text-sage">
            {isCurrent ? "Spent this week" : "Spent"}
          </p>
          <p className="font-display text-5xl tabular-nums">
            {formatThb(totalSpent)}
          </p>
          {totalIncome > 0 && (
            <p className="font-body text-xs text-ink/50">
              Income {formatThb(totalIncome)}
            </p>
          )}
          {weekCompare && (
            <p className="font-body text-xs text-ink/50">{weekCompare}</p>
          )}
          {paceText && (
            <p className="font-body text-xs text-ink/50">{paceText}</p>
          )}
        </div>

        {categoryRows.length > 0 ? (
          <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
            {categoryRows.map(({ name, icon, amount }) => (
              <div
                key={name}
                className="flex items-center justify-between px-3 py-2.5"
              >
                <span className="font-body text-sm">
                  {[icon, name].filter(Boolean).join(" ")}
                </span>
                <span className="font-body tabular-nums text-sm">
                  {formatThb(amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-body text-center text-sm text-ink/60">
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
