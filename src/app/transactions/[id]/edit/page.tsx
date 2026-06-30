import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateTransaction, deleteTransaction } from "../../actions";
import { catOptionLabel } from "@/components/CategoryIcon";
import { ReceiptUpload } from "@/components/ReceiptUpload";
import { ConfirmButton } from "@/components/ConfirmButton";

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

  const [{ data: transaction }, { data: categories }, { data: accounts }, { data: walletMemberships }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, amount, note, occurred_at, category_id, account_id, receipt_url, is_recurring, wallet_id")
        .eq("id", id)
        .eq("user_id", userData.user.id)
        .maybeSingle(),
      supabase.from("categories").select("id, name, icon").order("name"),
      supabase.from("accounts").select("id, name").order("name"),
      supabase.from("wallet_members").select("wallet_id").eq("user_id", userData.user.id),
    ]);

  const walletIds = (walletMemberships ?? []).map((m) => m.wallet_id);
  const { data: wallets } = walletIds.length
    ? await supabase.from("wallets").select("id, name").in("id", walletIds).order("name")
    : { data: [] };

  if (!transaction) notFound();

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
              <input type="radio" name="type" value="expense" defaultChecked={isExpense} className="peer sr-only" />
              <span className="block cursor-pointer rounded-xl border border-mist px-3 py-2.5 text-center font-body text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper transition-colors">
                Expense
              </span>
            </label>
            <label className="flex-1">
              <input type="radio" name="type" value="income" defaultChecked={!isExpense} className="peer sr-only" />
              <span className="block cursor-pointer rounded-xl border border-mist px-3 py-2.5 text-center font-body text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper transition-colors">
                Income
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="amount" className="font-body text-sm text-ink/70">Amount (฿)</label>
            <input
              id="amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              autoFocus
              defaultValue={absAmount}
              className="font-display tabular-nums text-2xl rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="category_id" className="font-body text-sm text-ink/70">Category</label>
            <select
              id="category_id"
              name="category_id"
              required
              defaultValue={transaction.category_id ?? ""}
              className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage"
            >
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{catOptionLabel(c.name, c.icon)}</option>
              ))}
            </select>
          </div>

          {accounts && accounts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="account_id" className="font-body text-sm text-ink/70">Account (optional)</label>
              <select
                id="account_id"
                name="account_id"
                defaultValue={transaction.account_id ?? ""}
                className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage"
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="occurred_at" className="font-body text-sm text-ink/70">Date</label>
            <input
              id="occurred_at"
              name="occurred_at"
              type="date"
              defaultValue={transaction.occurred_at}
              required
              className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="note" className="font-body text-sm text-ink/70">Note (optional)</label>
            <input
              id="note"
              name="note"
              type="text"
              defaultValue={transaction.note ?? ""}
              className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="is_recurring"
              value="1"
              defaultChecked={transaction.is_recurring}
              className="w-4 h-4 rounded border-mist accent-sage"
            />
            <span className="font-body text-sm text-ink/70">Recurring (monthly)</span>
          </label>

          {wallets && wallets.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="wallet_id" className="font-body text-sm text-ink/70">Shared wallet (optional)</label>
              <select
                id="wallet_id"
                name="wallet_id"
                defaultValue={transaction.wallet_id ?? ""}
                className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage"
              >
                <option value="">Personal</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          <ReceiptUpload existingUrl={transaction.receipt_url} />

          {error && <p className="font-body text-sm text-ink/70">{error}</p>}

          <button
            type="submit"
            className="font-body mt-2 rounded-full bg-ink px-3 py-3 text-paper transition-opacity hover:opacity-90"
            style={{ fontSize: "15px", fontWeight: 500 }}
          >
            Save changes
          </button>
        </form>

        <form action={deleteTransaction} className="mt-6">
          <input type="hidden" name="id" value={transaction.id} />
          <ConfirmButton className="font-body text-sm text-ink/30 hover:text-ink/60 transition-colors">
            Remove this transaction
          </ConfirmButton>
        </form>

        <a href="/transactions" className="font-body mt-4 block text-center text-sm text-sage underline">
          Cancel
        </a>
      </div>
    </main>
  );
}
