import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import {
  startOfMonth,
  monthProgress,
  parseMonthParam,
  prevMonthParam,
  nextMonthParam,
  isCurrentMonth,
} from "@/lib/month";
import { paceSignal } from "@/lib/signal";
import { CategoryIcon } from "@/components/CategoryIcon";

const monthHeading = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

// "Monday, 23 June" — matches the exploration's date style
const heroDateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function daysLeftInMonth(now: Date): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return last.getDate() - now.getDate();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const monthDate = parseMonthParam(monthParam);
  const monthStart = startOfMonth(monthDate);
  const viewing = isCurrentMonth(monthDate);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  // Week bounds for the digest card
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [
    { count: totalCount },
    { data: transactions },
    { data: budget },
    { data: weekTxns },
  ] = await Promise.all([
    supabase.from("transactions").select("*", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("id, amount, note, occurred_at, category_id, categories(name, icon)")
      .gte("occurred_at", monthStart)
      .lt("occurred_at", nextMonthParam(monthDate))
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("budgets")
      .select("id, total_amount, budget_lines(category_id, allocated_amount)")
      .eq("month", monthStart)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("amount")
      .lt("amount", 0)
      .gte("occurred_at", weekStartStr),
  ]);

  const isNewUser = (totalCount ?? 0) === 0;

  const spentThisMonth = (transactions ?? [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const leftToSpend = budget ? budget.total_amount - spentThisMonth : null;

  const weekSpend = (weekTxns ?? []).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Missed recurrings
  interface MissedItem {
    id: string;
    amount: number;
    note: string | null;
    categoryId: string | null;
    categoryName: string;
    icon: string | null;
  }
  let missedRecurrings: MissedItem[] = [];
  const dayOfMonth = new Date().getDate();

  if (viewing && dayOfMonth >= 5 && !isNewUser) {
    const since90 = new Date();
    since90.setDate(since90.getDate() - 90);
    const since90Str = since90.toISOString().slice(0, 10);

    const { data: hist } = await supabase
      .from("transactions")
      .select("id, amount, note, category_id, categories(name, icon), occurred_at")
      .lt("amount", 0)
      .gte("occurred_at", since90Str)
      .lt("occurred_at", monthStart);

    const groups = new Map<string, MissedItem & { count: number }>();
    for (const t of hist ?? []) {
      const key = `${t.category_id ?? ""}|${t.note ?? ""}|${t.amount}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
      } else {
        const catObj =
          t.categories && !Array.isArray(t.categories) ? t.categories : null;
        groups.set(key, {
          id: t.id,
          count: 1,
          amount: t.amount,
          note: t.note,
          categoryId: t.category_id,
          categoryName: catObj?.name ?? "Uncategorized",
          icon: catObj?.icon ?? null,
        });
      }
    }

    const thisMonthKeys = new Set(
      (transactions ?? [])
        .filter((t) => t.amount < 0)
        .map((t) => `${t.category_id ?? ""}|${t.note ?? ""}|${t.amount}`),
    );

    missedRecurrings = [...groups.values()]
      .filter((g) => {
        const k = `${g.categoryId ?? ""}|${g.note ?? ""}|${g.amount}`;
        return g.count >= 2 && !thisMonthKeys.has(k);
      })
      .slice(0, 3);
  }

  // 4 most recent transactions for the activity preview
  const recentFour = (transactions ?? []).slice(0, 4);

  const daysLeft = daysLeftInMonth(now);

  return (
    <main className="flex flex-1 flex-col">
      {isNewUser ? (
        /* Empty / first-run state */
        <div className="flex flex-1 flex-col justify-between px-6 pt-14 pb-10">
          <div className="flex flex-col gap-2">
            <p
              style={{ fontSize: "12px", fontWeight: 500, letterSpacing: ".05em", color: "var(--color-ink)" }}
              className="opacity-40"
            >
              {heroDateFmt.format(now)}
            </p>
            <h1
              className="font-display"
              style={{ fontSize: "22px", fontWeight: 500, color: "var(--color-ink)", marginTop: "2px" }}
            >
              {greeting()}
            </h1>
            <p className="font-body text-sm text-ink/60 mt-6 max-w-xs">
              Add your first transaction to get a clear picture of where you stand.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="/transactions/new"
              className="font-body w-full rounded-full bg-ink text-paper text-center transition-opacity hover:opacity-90"
              style={{ padding: "15px", fontSize: "15px", fontWeight: 500 }}
            >
              Add your first amount
            </a>
            <a href="/budget" className="font-body text-center text-sage" style={{ fontSize: "14px", fontWeight: 500 }}>
              Set a monthly budget first
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Month nav — only shown when browsing past months */}
          {!viewing && (
            <div className="flex items-center justify-center gap-4 px-6 pt-4">
              <a href={`/?month=${prevMonthParam(monthDate)}`} className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
              <span className="font-body text-sm text-ink/60 w-36 text-center">{monthHeading.format(monthDate)}</span>
              <a href={`/?month=${nextMonthParam(monthDate)}`} className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">→</a>
            </div>
          )}

          {/* The Single Number — Option A Editorial */}
          <div className="px-6 pt-9 pb-8">
            {/* Date + greeting */}
            <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-ink)" }} className="opacity-40">
              {heroDateFmt.format(now)}
            </p>
            <p
              className="font-display"
              style={{ fontSize: "22px", fontWeight: 500, color: "var(--color-ink)", marginTop: "2px", marginBottom: viewing ? "34px" : "16px" }}
            >
              {greeting()}
            </p>

            {/* Eyebrow */}
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-ink)", opacity: 0.4 }}>
              {budget
                ? viewing ? "Left to spend this month" : `Left to spend · ${monthHeading.format(monthDate)}`
                : viewing ? "Spent this month" : `Spent · ${monthHeading.format(monthDate)}`}
            </p>

            {/* Hero number */}
            <p
              className="font-display tabular-nums"
              style={{ fontSize: "48px", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.02, margin: "9px 0 12px" }}
            >
              {formatThb(leftToSpend ?? spentThisMonth)}
            </p>

            {/* Calm status line */}
            {budget && viewing && (
              <p style={{ fontSize: "14.5px", lineHeight: 1.55, color: "var(--color-ink)", opacity: 0.55 }}>
                {paceSignal(spentThisMonth, budget.total_amount, monthProgress())}
              </p>
            )}
            {!budget && viewing && (
              <a href="/budget" className="font-body text-sage" style={{ fontSize: "14.5px" }}>
                Set a budget for this month →
              </a>
            )}

            {/* Progress bar + metadata */}
            {budget && (
              <div className="mt-6">
                <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-mist)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, (spentThisMonth / budget.total_amount) * 100)}%`,
                      height: "100%",
                      background: "var(--color-sage)",
                      borderRadius: "999px",
                      transition: "width .3s ease",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2" style={{ fontSize: "12px", color: "var(--color-ink)", opacity: 0.4 }}>
                  <span className="tabular-nums">{formatThb(spentThisMonth)} spent</span>
                  {viewing && <span>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>}
                </div>
              </div>
            )}

            {/* Past month navigation */}
            {viewing && (
              <a
                href={`/?month=${prevMonthParam(monthDate)}`}
                className="font-body text-ink/40 hover:text-ink/60 transition-colors mt-4 inline-block"
                style={{ fontSize: "12px" }}
              >
                ← View last month
              </a>
            )}
          </div>

          {/* Missed recurrings */}
          {missedRecurrings.length > 0 && (
            <div className="flex flex-col gap-2 px-6 pb-6">
              <p className="font-body text-xs text-ink/40">Not recorded yet this month</p>
              <div className="flex flex-wrap gap-2">
                {missedRecurrings.map((item) => (
                  <a
                    key={item.id}
                    href={`/transactions/new?from=${item.id}`}
                    className="font-body text-xs rounded-full border border-mist px-3 py-1.5 text-ink/60 hover:bg-mist/40 transition-colors inline-flex items-center gap-1"
                  >
                    <CategoryIcon icon={item.icon} size={12} />
                    {item.categoryName}
                    {item.note ? ` · ${item.note}` : ""}
                    {" · "}
                    {formatThb(Math.abs(item.amount))}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className="flex flex-col gap-3 px-6 pb-6">
            <div className="flex items-center justify-between">
              <p className="font-body text-xs uppercase tracking-widest text-ink/40">
                Recent
              </p>
              <a href="/transactions" className="font-body text-xs text-sage">
                See all →
              </a>
            </div>

            {recentFour.length === 0 ? (
              <p className="font-body text-sm text-ink/60 text-center py-4">
                Nothing recorded yet this month.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
                {recentFour.map((t) => (
                  <a
                    key={t.id}
                    href={`/transactions/${t.id}/edit`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-mist/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sage-soft shrink-0">
                        <CategoryIcon icon={t.categories?.icon} size={15} />
                      </span>
                      <div className="flex flex-col">
                        <span className="font-body text-sm">
                          {t.categories?.name ?? "Uncategorized"}
                        </span>
                        {t.note && (
                          <span className="font-body text-xs text-ink/50">{t.note}</span>
                        )}
                        <span className="font-body text-xs text-ink/40">
                          {dayFmt.format(new Date(t.occurred_at + "T12:00:00"))}
                        </span>
                      </div>
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

          {/* This week digest card */}
          {viewing && (
            <div className="px-6 pb-10">
              <a
                href="/digest"
                className="block rounded-2xl border border-mist bg-surface px-5 py-4 hover:bg-mist/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-body text-xs uppercase tracking-widest text-ink/40">
                    This week
                  </p>
                  <span className="font-body text-xs text-sage">View →</span>
                </div>
                <p className="font-display text-2xl tabular-nums">
                  {formatThb(weekSpend)}
                </p>
                <p className="font-body text-xs text-ink/50 mt-1">
                  spent so far this week
                </p>
              </a>
            </div>
          )}
        </>
      )}
    </main>
  );
}
