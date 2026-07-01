import { createClient } from "@/lib/supabase/server";
import { createAccount } from "./actions";
import { formatThb } from "@/lib/format";
import { Toast } from "@/components/Toast";

function stalenessLabel(updatedAt: string | null): string | null {
  if (!updatedAt) return "Not set";
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days <= 7) return `Updated ${days}d ago`;
  if (days <= 30) return `Updated ${days}d ago`;
  return `Updated ${Math.floor(days / 30)}mo ago`;
}

function stalenessColor(updatedAt: string | null): string {
  if (!updatedAt) return "var(--color-terracotta)";
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
  if (days <= 7) return "var(--color-ink)";
  if (days <= 30) return "#c4a040";
  return "var(--color-terracotta)";
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, balance, balance_updated_at")
    .order("name");

  const list = accounts ?? [];
  const netWorth = list.reduce((s, a) => s + a.balance, 0);
  const hasAny = list.length > 0;

  return (
    <main className="flex flex-1 flex-col px-6">
      <Toast />
      <header className="flex items-center gap-4 py-6">
        <a href="/settings" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
        <h1 className="font-display text-3xl">Accounts</h1>
      </header>

      {/* Net worth */}
      {hasAny && (
        <a href="/net-worth" className="mb-5 rounded-2xl border border-mist bg-surface px-5 py-4 block hover:bg-mist/20 transition-colors">
          <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-ink)", opacity: 0.4, marginBottom: "6px" }}>
            Net worth
          </p>
          <div className="flex items-end justify-between">
            <p
              className="font-display tabular-nums"
              style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, color: netWorth >= 0 ? "var(--color-ink)" : "var(--color-terracotta)" }}
            >
              {netWorth < 0 ? "−" : ""}{formatThb(Math.abs(netWorth))}
            </p>
            <span className="font-body text-xs text-ink/30 pb-1">History →</span>
          </div>
        </a>
      )}

      {/* Account list */}
      {hasAny ? (
        <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist mb-6 overflow-hidden">
          {list.map((acc) => (
            <a
              key={acc.id}
              href={`/accounts/${acc.id}/edit`}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-mist/30 transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-sm">{acc.name}</span>
                <span
                  className="font-body text-[11px]"
                  style={{ color: stalenessColor(acc.balance_updated_at), opacity: 0.7 }}
                >
                  {stalenessLabel(acc.balance_updated_at)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="font-body tabular-nums text-sm"
                  style={{ color: acc.balance >= 0 ? "var(--color-ink)" : "var(--color-terracotta)" }}
                >
                  {acc.balance < 0 ? "−" : ""}{formatThb(Math.abs(acc.balance))}
                </span>
                <span className="font-body text-xs text-ink/30">›</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 mb-6 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/20">
            <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h.01"/>
          </svg>
          <p className="font-body text-sm text-ink/40">No accounts yet.</p>
          <p className="font-body text-xs text-ink/30 max-w-xs">Add your bank accounts, cash, and cards to track your net worth.</p>
        </div>
      )}

      {/* Transfer between accounts */}
      {list.length >= 2 && (
        <a
          href="/accounts/transfer"
          className="flex items-center justify-between rounded-2xl border border-mist bg-surface px-5 py-4 mb-5 hover:bg-mist/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-sage-soft text-sage shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
              </svg>
            </div>
            <div>
              <p className="font-body text-sm">Transfer between accounts</p>
              <p className="font-body text-[11px] text-ink/40">Move money without affecting budget</p>
            </div>
          </div>
          <span className="font-body text-xs text-ink/30">→</span>
        </a>
      )}

      {/* Add account */}
      <div className="rounded-2xl border border-mist bg-surface px-5 py-4 mb-8">
        <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">Add account</p>
        <form action={createAccount} className="flex flex-col gap-3">
          <input
            name="name"
            type="text"
            maxLength={100}
            required
            placeholder="Account name"
            autoComplete="off"
            className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-sage placeholder:text-ink/30"
          />
          <div className="flex flex-col gap-1">
            <label className="font-body text-xs text-ink/50">Starting balance (฿)</label>
            <input
              name="balance"
              type="number"
              inputMode="decimal"
              step="0.01"
              defaultValue="0"
              placeholder="0"
              className="font-display tabular-nums rounded-xl border border-mist bg-paper px-3 py-2.5 text-lg text-ink outline-none focus:border-sage placeholder:text-ink/30"
            />
          </div>
          <button
            type="submit"
            className="font-body rounded-full bg-ink px-3 py-3 text-paper transition-opacity hover:opacity-90"
            style={{ fontSize: "15px", fontWeight: 500 }}
          >
            Add account
          </button>
        </form>
        {error && <p className="font-body mt-3 text-sm text-ink/70">{error}</p>}
      </div>
    </main>
  );
}
