import { createClient } from "@/lib/supabase/server";
import { createTransaction } from "../actions";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Add a transaction</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          A quiet record of where the money went.
        </p>

        {!categories?.length ? (
          <p className="font-body text-sm text-ink/60">
            No categories yet — try refreshing in a moment, or reach out if
            this sticks around.
          </p>
        ) : (
        <form action={createTransaction} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="radio"
                name="type"
                value="expense"
                defaultChecked
                className="peer sr-only"
              />
              <span className="block cursor-pointer rounded-md border border-mist px-3 py-2 text-center font-body text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                Expense
              </span>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="type"
                value="income"
                className="peer sr-only"
              />
              <span className="block cursor-pointer rounded-md border border-mist px-3 py-2 text-center font-body text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                Income
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="amount" className="font-body text-sm text-ink/70">
              Amount (฿)
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              autoFocus
              className="font-display tabular-nums text-2xl rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="category_id"
              className="font-body text-sm text-ink/70"
            >
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              required
              className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
            >
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="occurred_at"
              className="font-body text-sm text-ink/70"
            >
              Date
            </label>
            <input
              id="occurred_at"
              name="occurred_at"
              type="date"
              defaultValue={today}
              required
              className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="note" className="font-body text-sm text-ink/70">
              Note (optional)
            </label>
            <input
              id="note"
              name="note"
              type="text"
              className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
            />
          </div>

          {error && <p className="font-body text-sm text-ink/70">{error}</p>}

          <button
            type="submit"
            className="font-body mt-2 rounded-md bg-ink px-3 py-2 text-paper transition-opacity hover:opacity-90"
          >
            Add
          </button>
          <a
            href="/"
            className="font-body text-center text-sm text-sage underline"
          >
            Cancel
          </a>
        </form>
        )}
      </div>
    </main>
  );
}
