import { createClient } from "@/lib/supabase/server";
import { createTransaction } from "../actions";
import { formatThb } from "@/lib/format";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from: fromId } = await searchParams;
  const supabase = await createClient();

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from("categories").select("id, name, icon").order("name"),
    supabase.from("accounts").select("id, name").order("name"),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  // Pre-fill from a previous transaction
  let prefill: {
    amount: number;
    categoryId: string | null;
    accountId: string | null;
    note: string | null;
  } | null = null;

  if (fromId) {
    const { data: source } = await supabase
      .from("transactions")
      .select("amount, category_id, account_id, note")
      .eq("id", fromId)
      .maybeSingle();
    if (source) {
      prefill = {
        amount: Math.abs(source.amount),
        categoryId: source.category_id,
        accountId: source.account_id,
        note: source.note,
      };
    }
  }

  // Recurring suggestions: expenses seen more than once in the last 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: recentTxns } = await supabase
    .from("transactions")
    .select("id, amount, note, category_id, categories(name, icon)")
    .lt("amount", 0)
    .gte("occurred_at", sinceStr)
    .order("occurred_at", { ascending: false });

  type Suggestion = {
    id: string;
    count: number;
    amount: number;
    note: string | null;
    categoryId: string | null;
    categoryName: string | null;
    categoryIcon: string | null;
  };

  const groups = new Map<string, Suggestion>();
  for (const t of recentTxns ?? []) {
    const key = `${t.category_id}|${t.note ?? ""}|${t.amount}`;
    const g = groups.get(key);
    if (g) {
      g.count++;
    } else {
      groups.set(key, {
        id: t.id,
        count: 1,
        amount: t.amount,
        note: t.note,
        categoryId: t.category_id,
        categoryName: t.categories?.name ?? null,
        categoryIcon: t.categories?.icon ?? null,
      });
    }
  }

  const suggestions = [...groups.values()]
    .filter((g) => g.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const catLabel = (name: string | null, icon: string | null) =>
    [icon, name ?? "Uncategorized"].filter(Boolean).join(" ");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Add a transaction</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          A quiet record of where the money went.
        </p>

        {/* Recurring suggestions — hidden when pre-filling */}
        {!prefill && suggestions.length > 0 && (
          <div className="flex flex-col gap-2 mb-8">
            <p className="font-body text-xs text-ink/40">Repeat a recent expense</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <a
                  key={s.id}
                  href={`/transactions/new?from=${s.id}`}
                  className="font-body text-sm rounded-full border border-mist px-3 py-1 text-ink/70 hover:border-ink/30 transition-colors"
                >
                  {catLabel(s.categoryName, s.categoryIcon)}
                  {s.note ? ` · ${s.note}` : ""}
                  <span className="tabular-nums ml-1.5 text-ink/50">
                    {formatThb(s.amount)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {!categories?.length ? (
          <p className="font-body text-sm text-ink/60">
            No categories yet — try refreshing in a moment.
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
                defaultValue={prefill?.amount ?? undefined}
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
                defaultValue={prefill?.categoryId ?? ""}
                className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
              >
                {!prefill && <option value="" disabled>Select a category</option>}
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {catLabel(c.name, c.icon)}
                  </option>
                ))}
              </select>
            </div>

            {accounts && accounts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="account_id"
                  className="font-body text-sm text-ink/70"
                >
                  Account (optional)
                </label>
                <select
                  id="account_id"
                  name="account_id"
                  defaultValue={prefill?.accountId ?? ""}
                  className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
                >
                  <option value="">No account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                defaultValue={prefill?.note ?? ""}
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
