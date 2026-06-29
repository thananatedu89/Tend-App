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
import { paceSignal } from "@/lib/signal";
import { quickLog } from "./actions";

const dayHeading = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const monthHeading = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

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

  const [
    { count: totalCount },
    { data: transactions },
    { data: budget },
    { data: categories },
  ] = await Promise.all([
    supabase.from("transactions").select("*", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("id, amount, note, occurred_at, category_id, categories(name, icon)")
      .gte("occurred_at", monthStart)
      .lt("occurred_at", nextMonthParam(monthDate))
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("budgets")
      .select("id, total_amount, budget_lines(category_id, allocated_amount)")
      .eq("month", monthStart)
      .maybeSingle(),
    supabase.from("categories").select("id, name, icon").order("name"),
  ]);

  const isNewUser = (totalCount ?? 0) === 0;

  const spentThisMonth = (transactions ?? [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const incomeThisMonth = (transactions ?? [])
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const leftToSpend = budget ? budget.total_amount - spentThisMonth : null;

  type CatEntry = { amount: number; displayName: string; categoryId: string | null };
  const catAcc = new Map<string, CatEntry>();
  for (const t of (transactions ?? []).filter((t) => t.amount < 0)) {
    const key = t.category_id ?? "__none__";
    const entry = catAcc.get(key);
    if (entry) {
      entry.amount += Math.abs(t.amount);
    } else {
      catAcc.set(key, {
        amount: Math.abs(t.amount),
        displayName: [t.categories?.icon, t.categories?.name ?? "Uncategorized"]
          .filter(Boolean)
          .join(" "),
        categoryId: t.category_id ?? null,
      });
    }
  }
  const categorySpending = [...catAcc.values()].sort((a, b) => b.amount - a.amount);
  const maxCategorySpend = categorySpending[0]?.amount ?? 1;

  const allocatedByCategory = new Map(
    (budget?.budget_lines ?? []).map((l) => [l.category_id, l.allocated_amount]),
  );

  const byDay = new Map<string, typeof transactions>();
  for (const t of transactions ?? []) {
    const key = t.occurred_at;
    byDay.set(key, [...(byDay.get(key) ?? []), t]);
  }

  // Missed recurrings: expenses that appeared 2+ times in prior 90 days
  // but haven't been recorded yet this month
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

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-body text-sm text-ink/60">
          {userData.user?.email}
        </span>
        <a href="/settings" className="font-body text-sm text-sage underline">
          Settings
        </a>
      </header>

      {isNewUser ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-4xl">Good to have you.</h1>
            <p className="font-body text-sm text-ink/60 max-w-xs">
              Add your first transaction to get a clear picture of where you stand.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <a
              href="/transactions/new"
              className="font-body w-full rounded-md bg-ink px-3 py-2.5 text-paper text-center text-sm transition-opacity hover:opacity-90"
            >
              Add a transaction
            </a>
            <a href="/budget" className="font-body text-sm text-sage underline">
              Set a monthly budget first
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-4 px-6 pb-2">
            <a
              href={`/?month=${prevMonthParam(monthDate)}`}
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
                href={`/?month=${nextMonthParam(monthDate)}`}
                className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
              >
                →
              </a>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="font-body text-sm text-sage">
              {budget ? (viewing ? "Left to spend this month" : "Left to spend") : (viewing ? "Spent this month" : "Spent")}
            </p>
            <p className="font-display text-5xl tabular-nums">
              {formatThb(leftToSpend ?? spentThisMonth)}
            </p>

            {budget && viewing ? (
              <p className="font-body text-sm text-ink/60">
                {paceSignal(spentThisMonth, budget.total_amount, monthProgress())}
              </p>
            ) : !budget && viewing ? (
              <a href="/budget" className="font-body text-sm text-sage underline">
                Set a budget for this month
              </a>
            ) : null}

            {budget && (
              <div className="w-48 h-1 bg-mist rounded-full overflow-hidden">
                <div
                  className="h-full bg-ink/40 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (spentThisMonth / budget.total_amount) * 100)}%` }}
                />
              </div>
            )}

            <div className="font-body mt-2 flex gap-4 text-xs text-ink/50">
              <span>Income {formatThb(incomeThisMonth)}</span>
              <span>Spent {formatThb(spentThisMonth)}</span>
            </div>

            {viewing && (
              <div className="mt-2 flex flex-col items-center gap-2">
                <div className="flex gap-4">
                  <a
                    href="/transactions/new"
                    className="font-body text-sm text-sage underline"
                  >
                    Add a transaction
                  </a>
                  {budget && (
                    <a href="/budget" className="font-body text-sm text-sage underline">
                      Edit budget
                    </a>
                  )}
                </div>
                <a
                  href="/transactions"
                  className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
                >
                  All transactions
                </a>
                <a href="/digest" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">
                  This week
                </a>
                <a href="/calendar" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">
                  Calendar
                </a>
                <a href="/insights" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">
                  Insights
                </a>
                <a href="/report" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">
                  Monthly report
                </a>
                <a href="/year" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">
                  Year overview
                </a>
              </div>
            )}
          </div>

          {categorySpending.length > 0 && (
            <div className="flex flex-col gap-2 px-6 pb-4">
              {categorySpending.map(({ displayName, amount, categoryId }) => {
                const allocated = categoryId
                  ? allocatedByCategory.get(categoryId)
                  : undefined;
                const overBudget = allocated !== undefined && amount > allocated;
                return (
                  <div key={categoryId ?? "__none__"} className="flex items-center gap-3">
                    <span className="font-body text-xs text-ink/50 w-28 text-right truncate">
                      {displayName}
                    </span>
                    <div className="flex-1 h-1 bg-mist rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${overBudget ? "bg-clay/60" : "bg-ink/50"}`}
                        style={{ width: `${(amount / maxCategorySpend) * 100}%` }}
                      />
                    </div>
                    <div className="flex flex-col items-end w-20">
                      <span className="font-body text-xs tabular-nums text-ink/50">
                        {formatThb(amount)}
                      </span>
                      {allocated && (
                        <span
                          className={`font-body text-[10px] tabular-nums ${
                            overBudget ? "text-clay/70" : "text-ink/30"
                          }`}
                        >
                          of {formatThb(allocated)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick log */}
          {viewing && categories && categories.length > 0 && (
            <form
              action={quickLog}
              className="flex items-center gap-2 px-6 pb-4"
            >
              <select
                name="category_id"
                required
                defaultValue=""
                className="font-body flex-1 min-w-0 rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage"
              >
                <option value="" disabled>
                  Category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.icon, c.name].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
              <input
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                placeholder="฿0"
                className="font-display tabular-nums w-24 rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage"
              />
              <button
                type="submit"
                className="font-body rounded-md bg-ink px-3 py-2 text-sm text-paper transition-opacity hover:opacity-90 whitespace-nowrap"
              >
                Log
              </button>
            </form>
          )}

          {missedRecurrings.length > 0 && (
            <div className="flex flex-col gap-2 px-6 pb-2">
              <p className="font-body text-xs text-ink/40">
                Not recorded yet this month
              </p>
              <div className="flex flex-wrap gap-2">
                {missedRecurrings.map((item) => (
                  <a
                    key={item.id}
                    href={`/transactions/new?from=${item.id}`}
                    className="font-body text-xs rounded-full border border-mist px-3 py-1.5 text-ink/60 hover:bg-mist/40 transition-colors"
                  >
                    {[item.icon, item.categoryName]
                      .filter(Boolean)
                      .join(" ")}
                    {item.note ? ` · ${item.note}` : ""}
                    {" · "}
                    {formatThb(Math.abs(item.amount))}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-1 flex-col gap-6 px-6 pb-10">
            {byDay.size === 0 && (
              <p className="font-body text-center text-sm text-ink/60">
                Nothing recorded yet this month.
              </p>
            )}
            {[...byDay.entries()].map(([date, items]) => (
              <div key={date} className="flex flex-col gap-2">
                <p className="font-body text-sm text-ink/60">
                  {dayHeading.format(new Date(date))}
                </p>
                <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
                  {items?.map((t) => (
                    <a
                      key={t.id}
                      href={`/transactions/${t.id}/edit`}
                      className="flex items-center justify-between px-3 py-2 hover:bg-mist/30 transition-colors"
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
                      </div>
                      <span className="font-body tabular-nums text-sm">
                        {t.amount < 0 ? "-" : "+"}
                        {formatThb(Math.abs(t.amount))}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
