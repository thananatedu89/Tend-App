import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { transferFunds } from "../actions";

export default async function TransferPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, balance")
    .order("name");

  const list = accounts ?? [];
  if (list.length < 2) redirect("/accounts?error=Need+at+least+2+accounts+to+transfer");

  return (
    <main className="flex flex-1 flex-col px-6">
      <header className="flex items-center gap-4 py-6">
        <a href="/accounts" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
        <h1 className="font-display text-3xl">Transfer</h1>
      </header>

      <div className="rounded-2xl border border-mist bg-surface px-5 py-5">
        <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-4">Move funds between accounts</p>
        <form action={transferFunds} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-xs text-ink/50">From</label>
            <select
              name="from_account_id"
              defaultValue={from ?? ""}
              className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-sage"
            >
              <option value="" disabled>Select account</option>
              {list.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (฿{acc.balance.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body text-xs text-ink/50">To</label>
            <select
              name="to_account_id"
              defaultValue=""
              className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-sage"
            >
              <option value="" disabled>Select account</option>
              {list.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (฿{acc.balance.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body text-xs text-ink/50">Amount (฿)</label>
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className="font-display tabular-nums rounded-xl border border-mist bg-paper px-3 py-2.5 text-lg text-ink outline-none focus:border-sage placeholder:text-ink/30"
            />
          </div>

          <button
            type="submit"
            className="font-body rounded-full bg-ink px-3 py-3 text-paper transition-opacity hover:opacity-90 mt-1"
            style={{ fontSize: "15px", fontWeight: 500 }}
          >
            Transfer
          </button>
        </form>
        {error && <p className="font-body mt-3 text-sm text-ink/70">{error}</p>}
      </div>

      <p className="font-body text-xs text-ink/30 text-center mt-4">
        Both account balances update instantly. This does not affect your spending budget.
      </p>
    </main>
  );
}
