import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import {
  startOfMonth,
  parseMonthParam,
  prevMonthParam,
  nextMonthParam,
  isCurrentMonth,
} from "@/lib/month";
import { CategoryIcon } from "@/components/CategoryIcon";

const monthHeading = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});
const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const monthDate = parseMonthParam(monthParam);
  const monthStart = startOfMonth(monthDate);
  const viewing = isCurrentMonth(monthDate);

  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const nextMonth = startOfMonth(new Date(y, m + 1, 1));

  const supabase = await createClient();

  const [{ data: transactions }, { data: budget }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, note, occurred_at, categories(name, icon)")
      .gte("occurred_at", monthStart)
      .lt("occurred_at", nextMonth)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("budgets")
      .select("total_amount")
      .eq("month", monthStart)
      .maybeSingle(),
  ]);

  let spent = 0;
  let income = 0;
  const catSpend: Record<string, { total: number; icon: string | null }> = {};

  for (const t of transactions ?? []) {
    if (t.amount < 0) {
      spent += Math.abs(t.amount);
      const name = t.categories?.name ?? "Uncategorized";
      const icon = t.categories?.icon ?? null;
      if (!catSpend[name]) catSpend[name] = { total: 0, icon };
      catSpend[name]!.total += Math.abs(t.amount);
    } else {
      income += t.amount;
    }
  }

  const topCats = Object.entries(catSpend)
    .map(([name, v]) => ({ name, total: v.total, icon: v.icon }))
    .sort((a, b) => b.total - a.total);
  const maxCat = topCats[0]?.total ?? 1;

  const topExpenses = (transactions ?? [])
    .filter((t) => t.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5);

  const budgetDelta = budget ? budget.total_amount - spent : null;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <a
          href="/"
          className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
        >
          ←
        </a>
        <h1 className="font-display text-lg">Monthly report</h1>
      </header>

      <div className="flex items-center justify-center gap-4 px-6 pb-4">
        <a
          href={`/report?month=${prevMonthParam(monthDate)}`}
          className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
        >
          ←
        </a>
        <span className="font-body text-sm text-ink/60 w-36 text-center">
          {monthHeading.format(monthDate)}
        </span>
        {viewing ? (
          <span className="w-6" />
        ) : (
          <a
            href={`/report?month=${nextMonthParam(monthDate)}`}
            className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
          >
            →
          </a>
        )}
      </div>

      <div className="flex flex-col gap-8 px-6 pb-12">
        <section className="flex flex-col items-center text-center gap-1.5">
          <p className="font-body text-sm text-sage">
            {viewing ? "Spent so far" : "Total spent"}
          </p>
          <p className="font-display text-5xl tabular-nums">{formatThb(spent)}</p>
          {budget && budgetDelta !== null && (
            <p className="font-body text-sm text-ink/60">
              Budget {formatThb(budget.total_amount)} ·{" "}
              {budgetDelta >= 0
                ? `${formatThb(budgetDelta)} under`
                : `${formatThb(Math.abs(budgetDelta))} over`}
            </p>
          )}
          {income > 0 && (
            <p className="font-body text-sm text-ink/60">
              Income {formatThb(income)} ·{" "}
              {income > spent
                ? `${formatThb(income - spent)} saved`
                : `${formatThb(spent - income)} over income`}
            </p>
          )}
        </section>

        {topCats.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="font-body text-sm text-ink/60">By category</p>
            <div className="flex flex-col gap-2">
              {topCats.slice(0, 8).map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="font-body text-xs text-ink/50 w-28 flex items-center justify-end gap-1 truncate">
                    <CategoryIcon icon={cat.icon} size={11} />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <div className="flex-1 h-1 bg-mist rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink/40 rounded-full"
                      style={{ width: `${(cat.total / maxCat) * 100}%` }}
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

        {topExpenses.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="font-body text-sm text-ink/60">Largest expenses</p>
            <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
              {topExpenses.map((t) => (
                <a
                  key={t.id}
                  href={`/transactions/${t.id}/edit`}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-mist/30 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-body text-sm flex items-center gap-1.5">
                      <CategoryIcon icon={t.categories?.icon} />
                      {t.categories?.name ?? "Uncategorized"}
                    </span>
                    {t.note && (
                      <span className="font-body text-xs text-ink/50">
                        {t.note}
                      </span>
                    )}
                    <span className="font-body text-xs text-ink/40">
                      {dayFmt.format(new Date(t.occurred_at + "T12:00:00"))}
                    </span>
                  </div>
                  <span className="font-body tabular-nums text-sm">
                    {formatThb(Math.abs(t.amount))}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {topCats.length === 0 && (
          <p className="font-body text-center text-sm text-ink/60">
            No expenses recorded for this month.
          </p>
        )}

        <a
          href={`/transactions?month=${monthStart}`}
          className="font-body text-center text-sm text-sage underline"
        >
          All transactions this month
        </a>
      </div>
    </main>
  );
}
