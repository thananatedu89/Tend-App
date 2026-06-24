import { createClient } from "@/lib/supabase/server";
import { startOfMonth } from "@/lib/month";
import { formatThb } from "@/lib/format";
import { setBudget, setBudgetLines } from "./actions";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: budget } = await supabase
    .from("budgets")
    .select("id, total_amount")
    .eq("month", startOfMonth())
    .maybeSingle();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
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
    .gte("occurred_at", startOfMonth())
    .lt("amount", 0);

  const spentByCategory = new Map<string, number>();
  for (const t of transactions ?? []) {
    if (!t.category_id) continue;
    spentByCategory.set(
      t.category_id,
      (spentByCategory.get(t.category_id) ?? 0) + Math.abs(t.amount),
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">This month&apos;s budget</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          One number to plan around. You can change it any time.
        </p>

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
                  <label
                    htmlFor={`line_${category.id}`}
                    className="flex flex-col"
                  >
                    <span className="font-body text-sm text-ink/70">
                      {category.name}
                    </span>
                    {spent > 0 && (
                      <span className="font-body text-xs text-ink/50">
                        {allocated
                          ? `${formatThb(spent)} of ${formatThb(allocated)}`
                          : `${formatThb(spent)} spent`}
                      </span>
                    )}
                  </label>
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
      </div>
    </main>
  );
}
