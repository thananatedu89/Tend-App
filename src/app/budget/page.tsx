import { createClient } from "@/lib/supabase/server";
import { startOfMonth } from "@/lib/month";
import { formatThb } from "@/lib/format";
import { setBudget, setBudgetLines, applyRollover, copyLastMonthBudget } from "./actions";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BudgetAISuggest } from "@/components/BudgetAISuggest";

const monthFmt = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const thisMonthStart = startOfMonth();

  const { data: budget } = await supabase
    .from("budgets")
    .select("id, total_amount")
    .eq("month", thisMonthStart)
    .maybeSingle();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon")
    .order("name");

  const { data: budgetLines } = budget
    ? await supabase
        .from("budget_lines")
        .select("category_id, allocated_amount")
        .eq("budget_id", budget.id)
    : { data: null };

  const allocatedByCategory = new Map(
    (budgetLines ?? []).map((line) => [line.category_id, line.allocated_amount]),
  );

  const { data: transactions } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .gte("occurred_at", thisMonthStart)
    .lt("amount", 0);

  const spentByCategory = new Map<string, number>();
  for (const t of transactions ?? []) {
    if (!t.category_id) continue;
    spentByCategory.set(
      t.category_id,
      (spentByCategory.get(t.category_id) ?? 0) + Math.abs(t.amount),
    );
  }

  // 3-month category averages for suggestions
  const _now = new Date();
  const threeMonthsAgo = new Date(_now.getFullYear(), _now.getMonth() - 3, 1);
  const threeMonthsAgoStr = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: hist3m } = await supabase
    .from("transactions")
    .select("category_id, amount, occurred_at")
    .lt("amount", 0)
    .gte("occurred_at", threeMonthsAgoStr)
    .lt("occurred_at", thisMonthStart);

  const catHistTotal = new Map<string, number>();
  const catHistMonths = new Map<string, Set<string>>();
  for (const t of hist3m ?? []) {
    if (!t.category_id) continue;
    catHistTotal.set(t.category_id, (catHistTotal.get(t.category_id) ?? 0) + Math.abs(t.amount));
    if (!catHistMonths.has(t.category_id)) catHistMonths.set(t.category_id, new Set());
    catHistMonths.get(t.category_id)!.add(t.occurred_at.slice(0, 7));
  }
  const catAvg = new Map<string, number>();
  for (const [catId, total] of catHistTotal) {
    const months = catHistMonths.get(catId)?.size ?? 1;
    catAvg.set(catId, Math.round(total / months));
  }

  // Past 6 months — budget history
  const { data: pastBudgets } = await supabase
    .from("budgets")
    .select("month, total_amount")
    .lt("month", thisMonthStart)
    .order("month", { ascending: false })
    .limit(6);

  const pastSpending: Record<string, number> = {};
  if (pastBudgets && pastBudgets.length > 0) {
    const earliest = pastBudgets[pastBudgets.length - 1].month;
    const { data: pastTxns } = await supabase
      .from("transactions")
      .select("amount, occurred_at")
      .gte("occurred_at", earliest)
      .lt("occurred_at", thisMonthStart)
      .lt("amount", 0);
    for (const t of pastTxns ?? []) {
      const key = t.occurred_at.slice(0, 7) + "-01";
      pastSpending[key] = (pastSpending[key] ?? 0) + Math.abs(t.amount);
    }
  }

  // Rollover: last month's unspent surplus
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStart = startOfMonth(prevMonthDate);
  const lastMonthBudget = pastBudgets?.find((b) => b.month === prevMonthStart);
  const lastMonthSpent = pastSpending[prevMonthStart] ?? 0;
  const rollover =
    lastMonthBudget && budget
      ? Math.max(0, lastMonthBudget.total_amount - lastMonthSpent)
      : 0;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">This month&apos;s budget</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          One number to plan around. You can change it any time.
        </p>

        {/* Carry-forward: no budget yet but last month had one */}
        {!budget && lastMonthBudget && (
          <form action={copyLastMonthBudget} className="mb-6">
            <button
              type="submit"
              className="font-body w-full text-left text-sm text-sage underline"
            >
              Copy {monthFmt.format(prevMonthDate)}&apos;s budget ({formatThb(lastMonthBudget.total_amount)})
            </button>
          </form>
        )}

        <form action={setBudget} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="total_amount"
              className="font-body text-sm text-ink/70"
            >
              Total for the month (฿)
            </label>
            <input
              id="total_amount"
              name="total_amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              autoFocus
              defaultValue={budget?.total_amount ?? undefined}
              className="font-display tabular-nums text-2xl rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
            />
          </div>

          {error && <p className="font-body text-sm text-ink/70">{error}</p>}

          <button
            type="submit"
            className="font-body mt-2 rounded-md bg-ink px-3 py-2 text-paper transition-opacity hover:opacity-90"
          >
            {budget ? "Update" : "Set budget"}
          </button>
          <a
            href="/"
            className="font-body text-center text-sm text-sage underline"
          >
            Cancel
          </a>
        </form>

        {catAvg.size > 0 && (
          <BudgetAISuggest
            categories={[...(categories ?? [])].map(c => ({
              id: c.id,
              name: c.name,
              avg: catAvg.get(c.id) ?? 0,
            }))}
            totalAvg={[...catAvg.values()].reduce((s, v) => s + v, 0)}
          />
        )}

        {/* Rollover prompt */}
        {rollover > 0 && (
          <form action={applyRollover} className="mt-4">
            <input type="hidden" name="rollover_amount" value={rollover} />
            <button
              type="submit"
              className="font-body w-full text-left text-sm text-sage underline"
            >
              {formatThb(rollover)} left from last month — add to this month
            </button>
          </form>
        )}

        <div className="flex justify-center gap-6 mt-6">
          <a href="/goals" className="font-body text-sm text-sage underline">
            Savings goals
          </a>
          <a href="/categories" className="font-body text-sm text-sage underline">
            Categories
          </a>
        </div>

        {budget && categories && categories.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-xl mb-1">Category budgets</h2>
            <p className="font-body text-sm text-ink/60 mb-6">
              Optional. Leave any category blank to skip it.
            </p>

            <form action={setBudgetLines} className="flex flex-col gap-3">
              <input type="hidden" name="budget_id" value={budget.id} />
              {categories.map((category) => {
                const spent = spentByCategory.get(category.id) ?? 0;
                const allocated = allocatedByCategory.get(category.id);
                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col">
                      <label
                        htmlFor={`line_${category.id}`}
                        className="font-body text-sm text-ink/70 flex items-center gap-1.5"
                      >
                        <CategoryIcon icon={category.icon} />
                        {category.name}
                      </label>
                      {spent > 0 && (
                        <a
                          href={`/budget/${category.id}`}
                          className="font-body text-xs hover:opacity-70 transition-opacity"
                          style={{
                            color: allocated && spent > allocated
                              ? "var(--color-terracotta)"
                              : "var(--color-ink)",
                            opacity: allocated && spent > allocated ? 1 : 0.5,
                          }}
                        >
                          {allocated && spent > allocated
                            ? `${formatThb(spent - allocated)} over →`
                            : allocated
                            ? `${formatThb(spent)} of ${formatThb(allocated)} →`
                            : `${formatThb(spent)} spent →`}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      {catAvg.has(category.id) && (
                        <span className="font-body text-[10px] text-ink/35 tabular-nums">
                          avg {formatThb(catAvg.get(category.id)!)}/mo
                        </span>
                      )}
                      <input
                        id={`line_${category.id}`}
                        name={`line_${category.id}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        defaultValue={allocatedByCategory.get(category.id) ?? ""}
                        className="font-display tabular-nums w-28 rounded-md border border-mist bg-paper px-3 py-2 text-right text-ink outline-none focus:border-sage"
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="submit"
                className="font-body mt-2 rounded-md bg-ink px-3 py-2 text-paper transition-opacity hover:opacity-90"
              >
                Save category budgets
              </button>
            </form>
          </div>
        )}

        {/* Budget history */}
        {pastBudgets && pastBudgets.length > 0 && (
          <div className="mt-12 pb-10">
            <h2 className="font-display text-xl mb-4">Past months</h2>
            <div className="flex flex-col divide-y divide-mist">
              {pastBudgets.map((b) => {
                const [y, m] = b.month.split("-").map(Number);
                const monthDate = new Date(y, (m ?? 1) - 1, 1);
                const spent = pastSpending[b.month] ?? 0;
                const delta = b.total_amount - spent;
                return (
                  <div key={b.month} className="py-3 flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="font-body text-sm text-ink/60">
                        {monthFmt.format(monthDate)}
                      </span>
                      <span
                        className={`font-body text-xs tabular-nums ${
                          delta > 0
                            ? "text-sage"
                            : delta < 0
                            ? "text-ink/50"
                            : "text-ink/40"
                        }`}
                      >
                        {delta === 0
                          ? "On budget"
                          : delta > 0
                          ? `${formatThb(delta)} under`
                          : `${formatThb(Math.abs(delta))} over`}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-body text-sm tabular-nums">
                        {formatThb(spent)}
                      </span>
                      <span className="font-body text-xs tabular-nums text-ink/40">
                        of {formatThb(b.total_amount)}
                      </span>
                    </div>
                    <div className="h-0.5 bg-mist rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ink/30 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            b.total_amount > 0
                              ? (spent / b.total_amount) * 100
                              : 0,
                          )}%`,
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
    </main>
  );
}
