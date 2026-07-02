import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";
import { formatThb } from "@/lib/format";
import { redirect } from "next/navigation";
import { CategoryIcon } from "@/components/CategoryIcon";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function YearPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam) : currentYear;

  if (!Number.isFinite(year) || year < 2000 || year > currentYear + 1) {
    redirect("/year");
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  const { data: txns } = await supabase
    .from("transactions")
    .select("amount, occurred_at, categories(name, icon)")
    .gte("occurred_at", yearStart)
    .lt("occurred_at", yearEnd);

  const monthData = Array.from({ length: 12 }, () => ({
    spent: 0,
    income: 0,
  }));

  const catTotals: Record<string, { total: number; icon: string | null }> = {};

  for (const t of txns ?? []) {
    const monthIdx = parseInt(t.occurred_at.slice(5, 7)) - 1;
    if (t.amount < 0) {
      monthData[monthIdx]!.spent += Math.abs(t.amount);
      const name =
        (t.categories && !Array.isArray(t.categories)
          ? t.categories.name
          : null) ?? "Uncategorized";
      const icon =
        t.categories && !Array.isArray(t.categories)
          ? t.categories.icon
          : null;
      if (!catTotals[name]) catTotals[name] = { total: 0, icon };
      catTotals[name]!.total += Math.abs(t.amount);
    } else {
      monthData[monthIdx]!.income += t.amount;
    }
  }

  const totalSpent = monthData.reduce((s, m) => s + m.spent, 0);
  const totalIncome = monthData.reduce((s, m) => s + m.income, 0);
  const maxMonthSpent = Math.max(...monthData.map((m) => m.spent), 1);

  const topCats = Object.entries(catTotals)
    .map(([name, v]) => ({ name, total: v.total, icon: v.icon }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const maxCat = topCats[0]?.total ?? 1;

  const isCurrentYear = year === currentYear;
  const hasTxns = totalSpent > 0 || totalIncome > 0;

  // Find peak month
  const peakMonthIdx = monthData.reduce(
    (peak, m, i) => (m.spent > (monthData[peak]?.spent ?? 0) ? i : peak),
    0,
  );

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <BackButton />
        <h1 className="font-display text-lg">Year overview</h1>
      </header>

      <div className="flex items-center justify-center gap-4 px-6 pb-4">
        <a
          href={`/year?year=${year - 1}`}
          className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
        >
          ←
        </a>
        <span className="font-body text-sm text-ink/60 w-16 text-center">
          {year}
        </span>
        {isCurrentYear ? (
          <span className="w-6" />
        ) : (
          <a
            href={`/year?year=${year + 1}`}
            className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
          >
            →
          </a>
        )}
      </div>

      {!hasTxns ? (
        <p className="font-body text-center text-sm text-ink/60 pt-8">
          No transactions in {year}.
        </p>
      ) : (
        <div className="flex flex-col gap-8 px-6 pb-12">
          <section className="flex flex-col items-center text-center gap-1.5">
            <p className="font-body text-sm text-sage">
              {isCurrentYear ? "Spent so far" : "Total spent"}
            </p>
            <p className="font-display text-5xl tabular-nums">
              {formatThb(totalSpent)}
            </p>
            {totalIncome > 0 && (
              <p className="font-body text-sm text-ink/60">
                Income {formatThb(totalIncome)} ·{" "}
                {totalIncome > totalSpent
                  ? `${formatThb(totalIncome - totalSpent)} saved`
                  : `${formatThb(totalSpent - totalIncome)} over income`}
              </p>
            )}
            {totalSpent > 0 && (
              <p className="font-body text-xs text-ink/40">
                {formatThb(Math.round(totalSpent / 12))} avg / month ·{" "}
                {MONTH_LABELS[peakMonthIdx]} was highest
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <p className="font-body text-sm text-ink/60">Monthly spending</p>
            <div className="flex items-end gap-1" style={{ height: "96px" }}>
              {monthData.map((m, i) => {
                const now = new Date();
                const isCurrent =
                  isCurrentYear && i === now.getMonth();
                const isFuture =
                  isCurrentYear && i > now.getMonth();
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1.5"
                    style={{ height: "100%" }}
                  >
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-sm transition-all ${
                          isFuture
                            ? "bg-transparent"
                            : isCurrent
                            ? "bg-ink/50"
                            : i === peakMonthIdx
                            ? "bg-ink/35"
                            : "bg-ink/20"
                        }`}
                        style={{
                          height: isFuture
                            ? "0"
                            : `${Math.max(m.spent > 0 ? 2 : 0, (m.spent / maxMonthSpent) * 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`font-body text-[9px] leading-none ${
                        isCurrent ? "text-sage" : "text-ink/30"
                      }`}
                    >
                      {MONTH_LABELS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {topCats.length > 0 && (
            <section className="flex flex-col gap-3">
              <p className="font-body text-sm text-ink/60">Top categories</p>
              <div className="flex flex-col gap-2">
                {topCats.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="font-body text-xs text-ink/50 w-28 flex items-center justify-end gap-1 truncate">
                      <CategoryIcon icon={cat.icon} size={11} />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <div className="flex-1 h-1 bg-mist rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ink/40 rounded-full"
                        style={{ width: `${(cat.total / maxCat) * 100}%` }}
                      />
                    </div>
                    <span className="font-body text-xs tabular-nums text-ink/50 w-20 text-right">
                      {formatThb(cat.total)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-center gap-6">
            <a
              href={`/year?year=${year - 1}`}
              className="font-body text-sm text-sage underline"
            >
              {year - 1}
            </a>
            {!isCurrentYear && (
              <a
                href={`/year?year=${year + 1}`}
                className="font-body text-sm text-sage underline"
              >
                {year + 1}
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
