import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import {
  startOfMonth,
  parseMonthParam,
  prevMonthParam,
  nextMonthParam,
  isCurrentMonth,
} from "@/lib/month";

const monthHeading = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

function cellAmount(n: number): string {
  if (n === 0) return "";
  if (n >= 10000) return `฿${Math.round(n / 1000)}k`;
  if (n >= 1000) return `฿${(n / 1000).toFixed(1)}k`;
  return `฿${Math.round(n)}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const monthDate = parseMonthParam(monthParam);
  const viewing = isCurrentMonth(monthDate);
  const monthStart = startOfMonth(monthDate);

  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();

  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, occurred_at")
    .gte("occurred_at", monthStart)
    .lt("occurred_at", startOfMonth(new Date(y, m + 1, 1)));

  const spendByDay: Record<number, number> = {};
  let monthTotal = 0;

  for (const t of transactions ?? []) {
    if (t.amount >= 0) continue;
    const day = parseInt(t.occurred_at.slice(8, 10));
    spendByDay[day] = (spendByDay[day] ?? 0) + Math.abs(t.amount);
    monthTotal += Math.abs(t.amount);
  }

  const maxDaySpend = Math.max(...Object.values(spendByDay), 1);

  // Monday-first calendar grid
  const firstDayOfWeek = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells: { day: number | null; spent: number }[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, spent: 0 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, spent: spendByDay[d] ?? 0 });
  while (cells.length % 7 !== 0) cells.push({ day: null, spent: 0 });

  const DOW = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <a
          href="/"
          className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
        >
          ←
        </a>
        <h1 className="font-display text-lg">Calendar</h1>
      </header>

      <div className="flex items-center justify-center gap-4 px-6 pb-4">
        <a
          href={`/calendar?month=${prevMonthParam(monthDate)}`}
          className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
        >
          ←
        </a>
        <span className="font-body text-sm text-ink/60 w-36 text-center">
          {monthHeading.format(monthDate)}
        </span>
        {viewing ? (
          <span className="w-6" />
        ) : (
          <a
            href={`/calendar?month=${nextMonthParam(monthDate)}`}
            className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
          >
            →
          </a>
        )}
      </div>

      <div className="px-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DOW.map((d, i) => (
            <div
              key={i}
              className="font-body text-[10px] text-ink/30 text-center py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-mist rounded-md overflow-hidden border border-mist">
          {cells.map((cell, i) => {
            const isToday =
              viewing &&
              cell.day === today.getDate();
            const intensity =
              cell.spent > 0 ? 0.08 + (cell.spent / maxDaySpend) * 0.35 : 0;

            return (
              <div
                key={i}
                className="bg-paper min-h-[52px] p-1 flex flex-col"
                style={
                  intensity > 0
                    ? { backgroundColor: `rgba(22,32,28,${intensity})` }
                    : undefined
                }
              >
                {cell.day !== null && (
                  <>
                    <span
                      className={`font-body text-[10px] leading-none ${
                        isToday ? "text-sage font-medium" : "text-ink/40"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {cell.spent > 0 && (
                      <span className="font-body text-[9px] tabular-nums text-ink/60 mt-auto leading-tight">
                        {cellAmount(cell.spent)}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {monthTotal > 0 && (
        <p className="font-body text-xs tabular-nums text-ink/40 text-center mt-4">
          {formatThb(monthTotal)} total
        </p>
      )}
    </main>
  );
}
