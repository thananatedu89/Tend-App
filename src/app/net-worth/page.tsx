import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";

function buildLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

function buildAreaPath(pts: { x: number; y: number }[], bottom: number): string {
  if (pts.length < 2) return "";
  const line = buildLinePath(pts);
  return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} L ${pts[0].x.toFixed(1)} ${bottom} Z`;
}

export default async function NetWorthPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: accounts }, { data: history }] = await Promise.all([
    supabase.from("accounts").select("id, name, balance").order("name"),
    supabase
      .from("account_balance_history")
      .select("account_id, balance, recorded_at")
      .gte("recorded_at", sinceStr)
      .order("recorded_at"),
  ]);

  const accountList = accounts ?? [];
  const historyList = history ?? [];

  const currentNetWorth = accountList.reduce((s, a) => s + a.balance, 0);

  // Build last 6 months (oldest → newest, current month last)
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const currentMonthKey = new Date().toISOString().slice(0, 7);

  // For each month, compute net worth = sum of last known balance per account up to end of that month
  const monthlyNetWorth = months.map((month) => {
    const cutoff = month + "-31"; // lexicographically after any valid day in that month
    let total = 0;
    for (const acc of accountList) {
      const snaps = historyList.filter(
        (h) => h.account_id === acc.id && h.recorded_at <= cutoff,
      );
      if (snaps.length > 0) {
        const latest = snaps.reduce((a, b) =>
          a.recorded_at > b.recorded_at ? a : b,
        );
        total += latest.balance;
      } else if (month === currentMonthKey) {
        // No snapshot yet — use current balance for current month
        total += acc.balance;
      }
    }
    return { month, total };
  });

  const prevMonthTotal = monthlyNetWorth[monthlyNetWorth.length - 2]?.total ?? 0;
  const delta = currentNetWorth - prevMonthTotal;
  const deltaAbs = Math.abs(delta);

  // SVG chart dimensions
  const W = 320, H = 80, PX = 16, PY = 10;
  const cW = W - 2 * PX;
  const cH = H - 2 * PY;

  const vals = monthlyNetWorth.map((m) => m.total);
  const minV = Math.min(...vals) - Math.abs(Math.min(...vals)) * 0.05;
  const maxV = Math.max(...vals) + Math.abs(Math.max(...vals)) * 0.05;
  const range = maxV - minV || 1;
  const n = monthlyNetWorth.length;

  const pts = monthlyNetWorth.map((m, i) => ({
    x: PX + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW),
    y: PY + cH - ((m.total - minV) / range) * cH,
  }));

  const linePath = buildLinePath(pts);
  const areaPath = buildAreaPath(pts, PY + cH);

  const monthLabels = months.map((m) => {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString("en", {
      month: "short",
    });
  });

  const assets = accountList.filter((a) => a.balance >= 0);
  const liabilities = accountList.filter((a) => a.balance < 0);
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiab = liabilities.reduce((s, a) => s + a.balance, 0);

  return (
    <main className="flex flex-1 flex-col px-6">
      <header className="flex items-center gap-4 py-6">
        <a href="/accounts" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
        <h1 className="font-display text-3xl">Net Worth</h1>
      </header>

      {/* Hero */}
      <div className="rounded-2xl border border-mist bg-surface px-5 py-5 mb-5">
        <p
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--color-ink)",
            opacity: 0.4,
            marginBottom: "6px",
          }}
        >
          Total net worth
        </p>
        <p
          className="font-display tabular-nums"
          style={{
            fontSize: "44px",
            fontWeight: 500,
            letterSpacing: "-0.025em",
            lineHeight: 1,
            color:
              currentNetWorth >= 0
                ? "var(--color-ink)"
                : "var(--color-terracotta)",
          }}
        >
          {currentNetWorth < 0 ? "−" : ""}
          {formatThb(Math.abs(currentNetWorth))}
        </p>
        {delta !== 0 && (
          <p
            className="font-body text-sm mt-2"
            style={{
              color:
                delta > 0
                  ? "var(--color-sage)"
                  : "var(--color-terracotta)",
            }}
          >
            {delta > 0 ? "+" : "−"}{formatThb(deltaAbs)} vs last month
          </p>
        )}
        {/* Asset/liability summary */}
        {accountList.length > 0 && (
          <div className="flex gap-5 mt-4 pt-4 border-t border-mist">
            <div>
              <p className="font-body text-[10px] uppercase tracking-widest text-ink/40">Assets</p>
              <p className="font-body text-sm tabular-nums text-ink">{formatThb(totalAssets)}</p>
            </div>
            {totalLiab < 0 && (
              <div>
                <p className="font-body text-[10px] uppercase tracking-widest text-ink/40">Liabilities</p>
                <p className="font-body text-sm tabular-nums" style={{ color: "var(--color-terracotta)" }}>
                  −{formatThb(Math.abs(totalLiab))}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6-month chart */}
      {accountList.length > 0 && (
        <div className="rounded-2xl border border-mist bg-surface px-4 py-4 mb-5">
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
            6-month trend
          </p>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-sage)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--color-sage)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {areaPath && <path d={areaPath} fill="url(#nw-grad)" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-sage)"
                strokeWidth="1.75"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-sage)" />
            ))}
          </svg>
          <div
            className="flex justify-between mt-1"
            style={{ paddingLeft: `${PX}px`, paddingRight: `${PX}px` }}
          >
            {monthLabels.map((label, i) => (
              <span key={i} className="font-body text-[10px] text-ink/30">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Assets */}
      {assets.length > 0 && (
        <div className="rounded-2xl border border-mist bg-surface mb-5 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="font-body text-xs uppercase tracking-widest text-ink/40">
              Assets
            </p>
          </div>
          <div className="flex flex-col divide-y divide-mist">
            {assets.map((acc) => (
              <a
                key={acc.id}
                href={`/accounts/${acc.id}/edit`}
                className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
              >
                <span className="font-body text-sm">{acc.name}</span>
                <span className="font-body text-sm tabular-nums">
                  {formatThb(acc.balance)}
                </span>
              </a>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-mist/10">
              <span className="font-body text-xs text-ink/40">Total assets</span>
              <span className="font-body text-sm tabular-nums text-ink/60">
                {formatThb(totalAssets)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Liabilities */}
      {liabilities.length > 0 && (
        <div className="rounded-2xl border border-mist bg-surface mb-5 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="font-body text-xs uppercase tracking-widest text-ink/40">
              Liabilities
            </p>
          </div>
          <div className="flex flex-col divide-y divide-mist">
            {liabilities.map((acc) => (
              <a
                key={acc.id}
                href={`/accounts/${acc.id}/edit`}
                className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
              >
                <span className="font-body text-sm">{acc.name}</span>
                <span
                  className="font-body text-sm tabular-nums"
                  style={{ color: "var(--color-terracotta)" }}
                >
                  −{formatThb(Math.abs(acc.balance))}
                </span>
              </a>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-mist/10">
              <span className="font-body text-xs text-ink/40">Total liabilities</span>
              <span
                className="font-body text-sm tabular-nums"
                style={{ color: "var(--color-terracotta)" }}
              >
                −{formatThb(Math.abs(totalLiab))}
              </span>
            </div>
          </div>
        </div>
      )}

      {accountList.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink/20"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M16 12h.01" />
          </svg>
          <p className="font-body text-sm text-ink/40">No accounts yet.</p>
          <a
            href="/accounts"
            className="font-body text-sm"
            style={{ color: "var(--color-sage)" }}
          >
            Add an account →
          </a>
        </div>
      )}
    </main>
  );
}
