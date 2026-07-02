import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";
import { TransactionFilters } from "@/components/TransactionFilters";
import { BulkActions } from "@/components/BulkActions";
import { categorizeUncategorized } from "./actions";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; date_from?: string; date_to?: string; type?: string; amount_min?: string; amount_max?: string; imported?: string; skipped?: string; categorized?: string; toast?: string }>;
}) {
  const { q, category, date_from, date_to, type, amount_min, amount_max, imported, skipped, categorized, toast } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon, color")
    .order("name");

  let query = supabase
    .from("transactions")
    .select("id, amount, note, occurred_at, is_recurring, categories(name, icon, color), accounts(name)")
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (q?.trim()) {
    const term = q.trim();
    const matchingCategoryIds = (categories ?? [])
      .filter((c) => c.name.toLowerCase().includes(term.toLowerCase()))
      .map((c) => c.id);
    if (matchingCategoryIds.length > 0) {
      query = query.or(`note.ilike.%${term}%,category_id.in.(${matchingCategoryIds.join(",")})`);
    } else {
      query = query.ilike("note", `%${term}%`);
    }
  }

  if (category) query = query.eq("category_id", category);
  if (date_from) query = query.gte("occurred_at", date_from);
  if (date_to) query = query.lte("occurred_at", date_to);
  if (type === "expense") query = query.lt("amount", 0);
  if (type === "income") query = query.gt("amount", 0);

  const { data: rawTransactions } = await query;

  // Amount range filters on absolute value (post-fetch, limit is 300 rows)
  const minNum = amount_min ? parseFloat(amount_min) : null;
  const maxNum = amount_max ? parseFloat(amount_max) : null;
  const transactions =
    minNum !== null || maxNum !== null
      ? (rawTransactions ?? []).filter((t) => {
          const abs = Math.abs(t.amount);
          if (minNum !== null && !isNaN(minNum) && abs < minNum) return false;
          if (maxNum !== null && !isNaN(maxNum) && abs > maxNum) return false;
          return true;
        })
      : (rawTransactions ?? []);

  const hasFilter = !!q?.trim() || !!category || !!date_from || !!date_to || !!type || !!amount_min || !!amount_max;
  const count = transactions.length;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="font-display text-lg">Transactions</h1>
        </div>
        <a href="/import" className="font-body text-xs text-ink/40 hover:text-ink/70 transition-colors">Import</a>
      </header>

      {toast && (
        <p className="font-body mx-6 mb-2 rounded-md bg-mist/40 px-3 py-2 text-sm text-ink/70">
          {toast}
        </p>
      )}

      {imported && (
        <div className="mx-6 mb-2 rounded-md bg-mist/40 px-3 py-2.5 flex flex-col gap-1.5">
          <p className="font-body text-sm text-ink/70">
            {imported} transaction{Number(imported) !== 1 ? "s" : ""} imported
            {categorized ? `, ${categorized} categorized automatically` : ""}
            {skipped ? `, ${skipped} skipped` : ""}.
          </p>
          {categorized && Number(imported) - Number(categorized) > 0 && (
            <form action={categorizeUncategorized}>
              <button
                type="submit"
                className="font-body text-xs text-sage hover:opacity-70 transition-opacity"
              >
                Categorize {Number(imported) - Number(categorized)} remaining →
              </button>
            </form>
          )}
          {!categorized && (
            <form action={categorizeUncategorized}>
              <button
                type="submit"
                className="font-body text-xs text-sage hover:opacity-70 transition-opacity"
              >
                Auto-categorize all →
              </button>
            </form>
          )}
        </div>
      )}

      <TransactionFilters
        categories={categories ?? []}
        q={q}
        category={category}
        date_from={date_from}
        date_to={date_to}
        type={type}
        amount_min={amount_min}
        amount_max={amount_max}
      />

      <BulkActions
        transactions={transactions}
        categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
        hasFilter={hasFilter}
        count={count}
      />
    </main>
  );
}
