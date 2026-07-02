import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { CategoryIcon } from "@/components/CategoryIcon";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const headerFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const { w } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const now = new Date();
  const currentMonday = getMondayOf(now);

  let weekStart: Date;
  if (w && /^\d{4}-\d{2}-\d{2}$/.test(w)) {
    const parsed = new Date(w + "T00:00:00");
    weekStart = isNaN(parsed.getTime()) ? currentMonday : getMondayOf(parsed);
  } else {
    weekStart = currentMonday;
  }
  if (weekStart > currentMonday) weekStart = currentMonday;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const fromStr = prevWeekStart.toISOString().slice(0, 10);
  const toStr = new Date(weekEnd.getTime() - 86400000).toISOString().slice(0, 10);

  const { data: txns } = await supabase
    .from("transactions")
    .select("amount, occurred_at, categories(name, icon)")
    .eq("user_id", userData.user.id)
    .gte("occurred_at", fromStr)
    .lte("occurred_at", toStr)
    .lt("amount", 0)
    .order("occurred_at", { ascending: true });

  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const thisWeekTxns = (txns ?? []).filter((t) => t.occurred_at >= weekStartStr);
  const prevWeekTxns = (txns ?? []).filter((t) => t.occurred_at < weekStartStr);

  // Day-by-day spending
  const daySpend = Array<number>(7).fill(0);
  for (const t of thisWeekTxns) {
    const d = new Date(t.occurred_at + "T12:00:00");
    const idx = (d.getDay() + 6) % 7;
    daySpend[idx] = (daySpend[idx] ?? 0) + Math.abs(t.amount);
  }

  // Category breakdown
  const catMap: Record<string, { total: number; icon: string | null }> = {};
  for (const t of thisWeekTxns) {
    const name =
      (t.categories && !Array.isArray(t.categories) ? t.categories.name : null) ??
      "Uncategorized";
    const icon =
      t.categories && !Array.isArray(t.categories) ? t.categories.icon : null;
    if (!catMap[name]) catMap[name] = { total: 0, icon };
    catMap[name]!.total += Math.abs(t.amount);
  }
  const cats = Object.entries(catMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);

  const thisWeekTotal = thisWeekTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  const prevWeekTotal = prevWeekTxns.reduce((s, t) => s + Math.abs(t.amount), 0);

  const isCurrentWeek = weekStartStr === currentMonday.toISOString().slice(0, 10);
  const todayDowIdx = isCurrentWeek ? (now.getDay() + 6) % 7 : -1;
  const daysElapsed = isCurrentWeek
    ? Math.min(7, Math.floor((now.getTime() - weekStart.getTime()) / 86400000) + 1)
    : 7;
  const dailyAvg = daysElapsed > 0 ? thisWeekTotal / daysElapsed : 0;

  const delta = thisWeekTotal - prevWeekTotal;
  const deltaPct = prevWeekTotal > 0 ? Math.round(Math.abs(delta / prevWeekTotal) * 100) : null;

  const weekEndDisplay = new Date(weekEnd.getTime() - 86400000);
  const weekLabel = `${headerFmt.format(weekStart)} – ${headerFmt.format(weekEndDisplay)}`;

  const prevWeekParam = prevWeekStart.toISOString().slice(0, 10);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const canGoNext = nextWeekStart <= currentMonday;

  const maxDay = Math.max(...daySpend, 1);
  const maxCat = cats[0]?.total ?? 1;

  return (
    <main className="flex flex-1 flex-col">
      {/* Header with week nav */}
      <header className="flex items-center px-6 py-4">
        <BackButton className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors w-6" />
        <div className="flex-1 flex items-center justify-center gap-4">
          <a
            href={`/week?w=${prevWeekParam}`}
            className="font-body text-base text-ink/40 hover:text-ink/70 transition-colors px-1"
          >
            ‹
          </a>
          <span className="font-body text-sm text-ink/70">{weekLabel}</span>
          {canGoNext ? (
            <a
              href={`/week?w=${nextWeekStart.toISOString().slice(0, 10)}`}
              className="font-body text-base text-ink/40 hover:text-ink/70 transition-colors px-1"
            >
              ›
            </a>
          ) : (
            <span className="font-body text-base text-ink/20 px-1">›</span>
          )}
        </div>
        <div className="w-6" />
      </header>

      <div className="flex flex-col gap-8 px-6 pb-12">
        {/* Hero */}
        <div>
          <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-ink)", opacity: 0.4, marginBottom: "6px" }}>
            {isCurrentWeek ? "This week" : "Total spent"}
          </p>
          <p className="font-display tabular-nums" style={{ fontSize: "48px", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1 }}>
            {formatThb(thisWeekTotal)}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            {daysElapsed > 1 && (
              <p className="font-body text-sm text-ink/50">
                {formatThb(Math.round(dailyAvg))} / day
              </p>
            )}
            {prevWeekTotal > 0 && (
              <p
                className="font-body text-sm"
                style={{
                  color:
                    delta > 0
                      ? "var(--color-terracotta)"
                      : delta < 0
                      ? "var(--color-sage)"
                      : "var(--color-ink)",
                  opacity: 0.8,
                }}
              >
                {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"}{" "}
                {formatThb(Math.abs(delta))} vs prev week
                {deltaPct !== null ? ` (${deltaPct}%)` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Day bars */}
        <section>
          <div className="flex items-end gap-2" style={{ height: "80px" }}>
            {DOW.map((label, i) => {
              const spend = daySpend[i] ?? 0;
              const isToday = i === todayDowIdx;
              const isFuture = isCurrentWeek && todayDowIdx >= 0 && i > todayDowIdx;
              return (
                <div
                  key={label}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  style={{ height: "100%" }}
                >
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-sm transition-all ${
                        isToday
                          ? "bg-ink/60"
                          : isFuture
                          ? "bg-mist"
                          : "bg-ink/25"
                      }`}
                      style={{
                        height: `${Math.max(spend > 0 ? 5 : 0, (spend / maxDay) * 100)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`font-body text-[10px] leading-none ${
                      isToday ? "text-ink/70 font-medium" : "text-ink/35"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Category breakdown */}
        {cats.length > 0 ? (
          <section className="flex flex-col gap-3">
            <p className="font-body text-sm text-ink/60">By category</p>
            <div className="flex flex-col gap-2.5">
              {cats.map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="font-body text-xs text-ink/50 w-28 flex items-center justify-end gap-1 truncate shrink-0">
                    <CategoryIcon icon={cat.icon} size={11} />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <div className="flex-1 h-1.5 bg-mist rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink/40 rounded-full"
                      style={{ width: `${(cat.total / maxCat) * 100}%` }}
                    />
                  </div>
                  <span className="font-body text-xs tabular-nums text-ink/50 w-20 text-right shrink-0">
                    {formatThb(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className="font-body text-sm text-ink/40 text-center py-8">
            No spending logged this week.
          </p>
        )}

        {/* Week comparison */}
        {prevWeekTotal > 0 && (
          <section className="flex flex-col gap-3">
            <p className="font-body text-sm text-ink/60">Week comparison</p>
            <div className="rounded-2xl border border-mist bg-surface px-5 py-4 flex gap-6">
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-xs text-ink/40">Prev week</span>
                <span className="font-display tabular-nums text-2xl">{formatThb(prevWeekTotal)}</span>
              </div>
              <div className="w-px bg-mist self-stretch" />
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-xs text-ink/40">{isCurrentWeek ? "This week" : weekLabel}</span>
                <span className="font-display tabular-nums text-2xl">{formatThb(thisWeekTotal)}</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
