import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { startOfMonth, nextMonthParam } from "@/lib/month";
import { CategoryBadge } from "@/components/CategoryIcon";

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function calmStatus(spent: number, allocated: number): string {
  const pct = allocated > 0 ? spent / allocated : 0;
  if (pct <= 0.5) return "Well within budget.";
  if (pct <= 0.8) return "On track for the month.";
  if (pct <= 1.0) return "Getting close to the limit.";
  const over = formatThb(spent - allocated);
  return `${over} over — noted.`;
}

export default async function BudgetCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const supabase = await createClient();
  const monthStart = startOfMonth();

  const [
    { data: category },
    { data: budget },
    { data: transactions },
  ] = await Promise.all([
    supabase.from("categories").select("id, name, icon").eq("id", categoryId).maybeSingle(),
    supabase
      .from("budgets")
      .select("id, total_amount, budget_lines(category_id, allocated_amount)")
      .eq("month", monthStart)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id, amount, note, occurred_at, accounts(name)")
      .eq("category_id", categoryId)
      .gte("occurred_at", monthStart)
      .lt("occurred_at", nextMonthParam(new Date()))
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!category) notFound();

  const spent = (transactions ?? [])
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const budgetLine = (budget?.budget_lines ?? []).find(
    (l) => l.category_id === categoryId,
  );
  const allocated = budgetLine?.allocated_amount ?? null;
  const left = allocated !== null ? allocated - spent : null;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <a
          href="/budget"
          className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
        >
          ←
        </a>
        <div className="flex items-center gap-2.5">
          <CategoryBadge icon={category.icon} size={15} />
          <h1 className="font-display text-lg">{category.name}</h1>
        </div>
      </header>

      {/* Single Number */}
      <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <p className="font-body text-xs uppercase tracking-widest text-ink/40">
          {allocated !== null ? "Left this month" : "Spent this month"}
        </p>
        <p className="font-display text-5xl tabular-nums">
          {formatThb(left ?? spent)}
        </p>

        {allocated !== null && (
          <p className="font-body text-sm text-ink/60 mt-1">
            {calmStatus(spent, allocated)}
          </p>
        )}

        {/* Progress bar */}
        {allocated !== null && (
          <div className="w-40 h-[5px] bg-mist rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-sage rounded-full transition-all"
              style={{ width: `${Math.min(100, (spent / allocated) * 100)}%` }}
            />
          </div>
        )}

        {allocated !== null && (
          <p className="font-body text-xs text-ink/40 mt-1 tabular-nums">
            {formatThb(spent)} of {formatThb(allocated)}
          </p>
        )}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-3 px-6 pb-12">
        <p className="font-body text-xs uppercase tracking-widest text-ink/40">
          This month
        </p>

        {(transactions ?? []).length === 0 ? (
          <p className="font-body text-sm text-ink/60 text-center py-6">
            No transactions in this category yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            {transactions?.map((t) => (
              <a
                key={t.id}
                href={`/transactions/${t.id}/edit`}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-mist/30 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-body text-sm">
                    {dayFmt.format(new Date(t.occurred_at + "T12:00:00"))}
                  </span>
                  {t.note && (
                    <span className="font-body text-xs text-ink/50">{t.note}</span>
                  )}
                  {t.accounts?.name && (
                    <span className="font-body text-xs text-ink/40">{t.accounts.name}</span>
                  )}
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
    </main>
  );
}
