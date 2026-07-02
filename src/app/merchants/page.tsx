import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { isPlus } from "@/lib/subscription";
import { PlusGate } from "@/components/PlusGate";

const lastVisitFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const PERIODS = [
  { val: "30", label: "30 days" },
  { val: "90", label: "3 months" },
  { val: "180", label: "6 months" },
] as const;

type PeriodVal = (typeof PERIODS)[number]["val"];

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: p } = await searchParams;
  const period: PeriodVal = (PERIODS.map((x) => x.val) as string[]).includes(p ?? "")
    ? (p as PeriodVal)
    : "90";
  const days = parseInt(period);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  if (!await isPlus(userData.user.id)) {
    return <PlusGate backHref="/settings" title="Merchants" description="See every payee ranked and trended — know exactly where your money goes." />;
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: txns } = await supabase
    .from("transactions")
    .select("amount, note, occurred_at")
    .not("note", "is", null)
    .lt("amount", 0)
    .gte("occurred_at", sinceStr)
    .order("occurred_at", { ascending: false });

  // Group expenses by note (case-insensitive key, display original casing)
  const map = new Map<string, { displayName: string; count: number; total: number; lastVisit: string }>();

  for (const t of txns ?? []) {
    const raw = t.note?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const prev = map.get(key);
    if (prev) {
      prev.count++;
      prev.total += Math.abs(t.amount);
      if (t.occurred_at > prev.lastVisit) prev.lastVisit = t.occurred_at;
    } else {
      map.set(key, {
        displayName: raw,
        count: 1,
        total: Math.abs(t.amount),
        lastVisit: t.occurred_at,
      });
    }
  }

  const merchants = [...map.values()]
    .map((m) => ({ ...m, avg: m.total / m.count }))
    .sort((a, b) => b.total - a.total);

  const totalExpenses = (txns ?? []).length;
  const withNotes = (txns ?? []).filter((t) => t.note?.trim()).length;
  const topTotal = merchants.reduce((s, m) => s + m.total, 0);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-6">
        <a href="/settings" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
        <h1 className="font-display text-3xl">Merchants</h1>
      </header>

      {/* Period pills */}
      <div className="flex gap-1.5 px-6 pb-4">
        {PERIODS.map(({ val, label }) => (
          <a
            key={val}
            href={`/merchants?period=${val}`}
            className={`font-body text-xs px-3 py-1.5 rounded-full border transition-colors ${
              period === val
                ? "bg-ink text-paper border-ink"
                : "border-mist text-ink/60 hover:border-ink/30"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {merchants.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center px-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/20">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <p className="font-body text-sm text-ink/40">No merchants found.</p>
          <p className="font-body text-xs text-ink/30 max-w-xs">
            Add notes to your transactions to see payee analytics here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-6 pb-12">
          {/* Summary strip */}
          <div className="flex gap-6 rounded-2xl border border-mist bg-surface px-5 py-4">
            <div>
              <p className="font-body text-[10px] uppercase tracking-widest text-ink/40">Payees</p>
              <p className="font-body text-lg tabular-nums">{merchants.length}</p>
            </div>
            <div>
              <p className="font-body text-[10px] uppercase tracking-widest text-ink/40">Total</p>
              <p className="font-body text-lg tabular-nums">{formatThb(topTotal)}</p>
            </div>
            <div>
              <p className="font-body text-[10px] uppercase tracking-widest text-ink/40">w/ notes</p>
              <p className="font-body text-lg tabular-nums">{withNotes}/{totalExpenses}</p>
            </div>
          </div>

          {/* Merchant cards */}
          <div className="flex flex-col gap-2">
            {merchants.slice(0, 50).map((m, i) => (
              <a
                key={m.displayName}
                href={`/transactions?q=${encodeURIComponent(m.displayName)}`}
                className="flex items-center gap-3 rounded-2xl border border-mist bg-surface px-4 py-3.5 hover:bg-mist/20 transition-colors"
              >
                <span
                  className="font-body text-[11px] text-center shrink-0 w-5"
                  style={{ color: i < 3 ? "var(--color-sage)" : "var(--color-ink)", opacity: i < 3 ? 0.8 : 0.25 }}
                >
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm truncate">{m.displayName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="font-body text-[11px] text-ink/40">{m.count}×</span>
                    <span className="font-body text-[10px] text-ink/20">·</span>
                    <span className="font-body text-[11px] text-ink/40">avg {formatThb(Math.round(m.avg))}</span>
                    <span className="font-body text-[10px] text-ink/20">·</span>
                    <span className="font-body text-[11px] text-ink/30">
                      last {lastVisitFmt.format(new Date(m.lastVisit + "T12:00:00"))}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-body text-sm tabular-nums">{formatThb(m.total)}</p>
                  <div
                    className="h-0.5 rounded-full mt-1.5"
                    style={{
                      width: `${Math.max(8, (m.total / merchants[0]!.total) * 64)}px`,
                      background: "var(--color-sage)",
                      opacity: 0.35,
                      marginLeft: "auto",
                    }}
                  />
                </div>
              </a>
            ))}
          </div>

          <p className="font-body text-xs text-ink/30 text-center mt-1">
            Tap a merchant to see all transactions
          </p>
        </div>
      )}
    </main>
  );
}
