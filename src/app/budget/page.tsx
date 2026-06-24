import { createClient } from "@/lib/supabase/server";
import { startOfMonth } from "@/lib/month";
import { setBudget } from "./actions";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: budget } = await supabase
    .from("budgets")
    .select("total_amount")
    .eq("month", startOfMonth())
    .maybeSingle();

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
      </div>
    </main>
  );
}
