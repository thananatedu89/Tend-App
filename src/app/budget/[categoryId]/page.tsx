import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { startOfMonth, nextMonthParam } from "@/lib/month";
import { CategoryBadge } from "@/components/CategoryIcon";

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function calmStatus(spent: number, allocated: number): string {
  const pct = allocated > 0 ? spent / allocated : 0;
  if (pct <= 0.5) return "Well within budget.";
  if (pct <= 0.8) return "On track for the month.";
  if (pct <= 1.0) return "Getting close to the limit.";
  const over = formatThb(spent - allocated);
  return `${over} over — noted.`;
}

function buildLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

function buildAreaPath(pts: { x: number; y: number }[], bottom: number): string {
  if (pts.length < 2) return "";
  const line = buildLinePath(pts);
  return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} L ${pts[0].x.toFixed(1)} ${bottom} Z`;
}

export default async function BudgetCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const supabase = await createClient();
  const monthStart = startOfMonth();

  // Build 6-month window
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  const sinceStr = sixMonthsAgo.toISOString().slice(0, 10);

  const [{ data: category }, { data: budget }, { data: transactions }, { data: historyTxns }] =
    await Promise.all([
      supabase.from("categories").select("id, name, icon").eq("id", categoryId).maybeSingle(),
      supabase
        .from("budgets")
        .select("id, total_amount, budget_lines(category_id, allocated_amount)")
        .eq("month", monthStart)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("id, amount, note, occurred_at, accounts(name)")
        .eq("category_id", categoryId)
        .gte("occurred_at", monthStart)
        .lt("occurred_at", nextMonthParam(new Date()))
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("amount, note, occurred_at")
        .eq("category_id", categoryId)
        .gte("occurred_at", sinceStr)
        .lt("amount", 0)
        .order("occurred_at"),
    ]);

  if (!category) notFound();

  const spent = (transactions ?? [])
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const budgetLine = (budget?.budget_lines ?? []).find((l) => l.category_id === categoryId);
  const allocated = budgetLine?.allocated_amount ?? null;
  const left = allocated !== null ? allocated - spent : null;

  // --- 6-month trend chart ---
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7)); // "YYYY-MM"
  }

  const spentByMonth = new Map<string, number>();
  for (const t of historyTxns ?? []) {
    const mo = t.occurred_at.slice(0, 7);
    spentByMonth.set(mo, (spentByMonth.get(mo) ?? 0) + Math.abs(t.amount));
  }

  const monthlyData = months.map((mo) => ({
    month: mo,
    spent: spentByMonth.get(mo) ?? 0,
  }));

  const monthLabels = months.map((m) => {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString("en", { month: "short" });
  });

  const W = 320, H = 72, PX = 16, PY = 10;
  const cW = W - 2 * PX, cH = H - 2 * PY;
  const vals = monthlyData.map((d) => d.spent);
  const maxV = Math.max(...vals, 1);
  const n = monthlyData.length;

  const pts = monthlyData.map((d, i) => ({
    x: PX + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW),
    y: PY + cH - (d.spent / maxV) * cH,
  }));

  const linePath = buildLinePath(pts);
  const areaPath = buildAreaPath(pts, PY + cH);

  // --- Top payees (last 3 months of history) ---
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsStr = threeMonthsAgo.toISOString().slice(0, 10);

  const payeeMap = new Map<string, number>();
  for (const t of historyTxns ?? []) {
    if (t.occurred_at < threeMonthsStr) continue;
    const key = t.note?.trim() || "(no note)";
    payeeMap.set(key, (payeeMap.get(key) ?? 0) + Math.abs(t.amount));
  }
  const topPayees = [...payeeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const hasHistory = vals.some((v) => v > 0);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <a href="/budget" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
        <div className="flex items-center gap-2.5">
          <CategoryBadge icon={category.icon} size={15} />
          <h1 className="font-display text-lg">{category.name}</h1>
        </div>
      </header>

      {/* Single Number */}
      <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <p className="font-body text-xs uppercase tracking-widest text-ink/40">
          {allocated !== null ? "Left this month" : "Spent this month"}
        </p>
        <p className="font-display text-5xl tabular-nums">
          {formatThb(left ?? spent)}
        </p>

        {allocated !== null && (
          <p className="font-body text-sm text-ink/60 mt-1">
            {calmStatus(spent, allocated)}
          </p>
        )}

        {allocated !== null && (
          <div className="w-40 h-[5px] bg-mist rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-sage rounded-full transition-all"
              style={{ width: `${Math.min(100, (spent / allocated) * 100)}%` }}
            />
          </div>
        )}

        {allocated !== null && (
          <p className="font-body text-xs text-ink/40 mt-1 tabular-nums">
            {formatThb(spent)} of {formatThb(allocated)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-5 px-6 pb-12">
        {/* 6-month trend chart */}
        {hasHistory && (
          <div className="rounded-2xl border border-mist bg-surface px-4 py-4">
            <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
              6-month trend
            </p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="cat-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-sage)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--color-sage)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {areaPath && <path d={areaPath} fill="url(#cat-grad)" />}
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
            <div className="flex justify-between mt-1" style={{ paddingLeft: `${PX}px`, paddingRight: `${PX}px` }}>
              {monthLabels.map((label, i) => (
                <span key={i} className="font-body text-[10px] text-ink/30">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top payees */}
        {topPayees.length > 0 && (
          <div>
            <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
              Top payees (last 3 months)
            </p>
            <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
              {topPayees.map(([note, amount]) => (
                <div key={note} className="flex items-center justify-between px-4 py-3">
                  <span className="font-body text-sm text-ink/70 truncate max-w-[60%]">{note}</span>
                  <span className="font-body text-sm tabular-nums">{formatThb(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* This month transactions */}
        <div>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
            This month
          </p>

          {(transactions ?? []).length === 0 ? (
            <p className="font-body text-sm text-ink/60 text-center py-6">
              No transactions in this category yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
              {transactions?.map((t) => (
                <a
                  key={t.id}
                  href={`/transactions/${t.id}/edit`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-mist/30 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-body text-sm">
                      {dayFmt.format(new Date(t.occurred_at + "T12:00:00"))}
                    </span>
                    {t.note && (
                      <span className="font-body text-xs text-ink/50">{t.note}</span>
                    )}
                    {t.accounts?.name && (
                      <span className="font-body text-xs text-ink/40">{t.accounts.name}</span>
                    )}
                  </div>
                  <span className={`font-body tabular-nums text-sm ${t.amount > 0 ? "text-sage" : ""}`}>
                    {t.amount < 0 ? "−" : "+"}
                    {formatThb(Math.abs(t.amount))}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
