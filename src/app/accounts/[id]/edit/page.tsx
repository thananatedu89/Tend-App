import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { updateAccount, deleteAccount } from "../../actions";
import { CategoryBadge } from "@/components/CategoryIcon";
import { ConfirmButton } from "@/components/ConfirmButton";

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default async function EditAccountPage({
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

  const [{ data: account }, { data: recentTxns }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, balance, balance_updated_at")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id, amount, note, occurred_at, categories(name, icon, color)")
      .eq("account_id", id)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!account) notFound();

  const updatedAt = account.balance_updated_at
    ? new Date(account.balance_updated_at)
    : null;
  const daysSince = updatedAt
    ? Math.floor((Date.now() - updatedAt.getTime()) / 86400000)
    : null;

  // Net change from transactions since last balance update
  const txnsSinceUpdate = updatedAt
    ? (recentTxns ?? []).filter((t) => new Date(t.occurred_at + "T12:00:00") > updatedAt)
    : [];
  const netChange = txnsSinceUpdate.reduce((s, t) => s + t.amount, 0);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-6">
        <a href="/accounts" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
        <h1 className="font-display text-lg">{account.name}</h1>
      </header>

      {/* Balance hero */}
      <div className="px-6 mb-6">
        <div className="rounded-2xl border border-mist bg-surface px-5 py-5">
          <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-ink)", opacity: 0.4, marginBottom: "6px" }}>
            Current balance
          </p>
          <p
            className="font-display tabular-nums"
            style={{ fontSize: "44px", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, color: account.balance >= 0 ? "var(--color-ink)" : "var(--color-terracotta)" }}
          >
            {account.balance < 0 ? "−" : ""}{formatThb(Math.abs(account.balance))}
          </p>
          {daysSince !== null && (
            <p className="font-body text-xs text-ink/40 mt-2">
              Set {daysSince === 0 ? "today" : daysSince === 1 ? "yesterday" : `${daysSince} days ago`}
              {netChange !== 0 && (
                <span style={{ color: netChange > 0 ? "var(--color-sage)" : "var(--color-terracotta)" }}>
                  {" "}· {netChange > 0 ? "+" : "−"}{formatThb(Math.abs(netChange))} since then
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Edit form */}
      <div className="px-6 mb-6">
        <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">Update</p>
        <form action={updateAccount} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={account.id} />
          <div className="flex flex-col gap-1">
            <label className="font-body text-xs text-ink/50">Account name</label>
            <input
              name="name"
              type="text"
              maxLength={100}
              required
              defaultValue={account.name}
              className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-sage"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-body text-xs text-ink/50">Balance (฿)</label>
            <input
              name="balance"
              type="number"
              inputMode="decimal"
              step="0.01"
              required
              defaultValue={account.balance}
              className="font-display tabular-nums rounded-xl border border-mist bg-paper px-3 py-2.5 text-2xl text-ink outline-none focus:border-sage"
            />
          </div>
          {error && <p className="font-body text-sm text-ink/70">{error}</p>}
          <button
            type="submit"
            className="font-body rounded-full bg-ink px-3 py-3 text-paper transition-opacity hover:opacity-90"
            style={{ fontSize: "15px", fontWeight: 500 }}
          >
            Save
          </button>
        </form>
      </div>

      {/* Recent transactions for this account */}
      {(recentTxns ?? []).length > 0 && (
        <div className="px-6 mb-6">
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">Recent transactions</p>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist overflow-hidden">
            {(recentTxns ?? []).map((t) => (
              <a
                key={t.id}
                href={`/transactions/${t.id}/edit`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-mist/30 transition-colors"
              >
                <CategoryBadge
                  icon={t.categories && !Array.isArray(t.categories) ? t.categories.icon : null}
                  color={t.categories && !Array.isArray(t.categories) ? t.categories.color : null}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-body text-sm truncate">
                    {t.categories && !Array.isArray(t.categories) ? t.categories.name : "Uncategorized"}
                  </span>
                  {t.note && <span className="font-body text-xs text-ink/50 truncate">{t.note}</span>}
                </div>
                <div className="text-right shrink-0">
                  <span className={`font-body tabular-nums text-sm ${t.amount > 0 ? "text-sage" : ""}`}>
                    {t.amount < 0 ? "−" : "+"}{formatThb(Math.abs(t.amount))}
                  </span>
                  <p className="font-body text-xs text-ink/40">{dayFmt.format(new Date(t.occurred_at + "T12:00:00"))}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="px-6 pb-12 mt-auto">
        <form action={deleteAccount}>
          <input type="hidden" name="id" value={account.id} />
          <ConfirmButton confirmLabel="Yes, remove account" className="font-body text-sm text-ink/30 hover:text-ink/60 transition-colors">
            Remove this account
          </ConfirmButton>
        </form>
        <p className="font-body mt-1 text-xs text-ink/30">Existing transactions will become unassigned.</p>
      </div>
    </main>
  );
}
