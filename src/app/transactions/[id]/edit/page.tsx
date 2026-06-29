import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateTransaction, deleteTransaction } from "../../actions";

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, amount, note, occurred_at, category_id")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!transaction) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const isExpense = transaction.amount < 0;
  const absAmount = Math.abs(transaction.amount);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Edit transaction</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          Adjust the details, or remove it entirely.
        </p>

        <form action={updateTransaction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={transaction.id} />

          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="radio"
                name="type"
                value="expense"
                defaultChecked={isExpense}
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
                defaultChecked={!isExpense}
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
              defaultValue={absAmount}
              className="font-display tabular-nums text-2xl rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="category_id" className="font-body text-sm text-ink/70">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              required
              defaultValue={transaction.category_id ?? ""}
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
            <label htmlFor="occurred_at" className="font-body text-sm text-ink/70">
              Date
            </label>
            <input
              id="occurred_at"
              name="occurred_at"
              type="date"
              defaultValue={transaction.occurred_at}
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
              defaultValue={transaction.note ?? ""}
              className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
            />
          </div>

          {error && <p className="font-body text-sm text-ink/70">{error}</p>}

          <button
            type="submit"
            className="font-body mt-2 rounded-md bg-ink px-3 py-2 text-paper transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </form>

        <form action={deleteTransaction} className="mt-3">
          <input type="hidden" name="id" value={transaction.id} />
          <button
            type="submit"
            className="font-body w-full rounded-md border border-mist px-3 py-2 text-ink/60 transition-opacity hover:opacity-70"
          >
            Remove this transaction
          </button>
        </form>

        <a
          href="/transactions"
          className="font-body mt-4 block text-center text-sm text-sage underline"
        >
          Cancel
        </a>
      </div>
    </main>
  );
}
