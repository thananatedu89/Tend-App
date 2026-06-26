import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import {
  startOfWeek,
  parseWeekParam,
  prevWeekParam,
  nextWeekParam,
  weekEndDate,
  weekDateStr,
  isCurrentWeek,
} from "@/lib/week";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default async function DigestPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const weekStart = parseWeekParam(weekParam);
  const weekEnd = weekEndDate(weekStart);
  const isCurrent = isCurrentWeek(weekStart);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, category_id, categories(name)")
    .gte("occurred_at", weekDateStr(weekStart))
    .lte("occurred_at", weekDateStr(weekEnd));

  const spentByCategory = new Map<string, { name: string; amount: number }>();
  let totalSpent = 0;
  let totalIncome = 0;

  for (const t of transactions ?? []) {
    if (t.amount < 0) {
      totalSpent += Math.abs(t.amount);
      const key = t.category_id ?? "__none__";
      const name = t.categories?.name ?? "Uncategorized";
      spentByCategory.set(key, {
        name,
        amount: (spentByCategory.get(key)?.amount ?? 0) + Math.abs(t.amount),
      });
    } else {
      totalIncome += t.amount;
    }
  }

  const categoryRows = [...spentByCategory.values()].sort((a, b) => b.amount - a.amount);

  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekLabel = sameMonth
    ? `${weekStart.getDate()}–${dateFmt.format(weekEnd)}`
    : `${dateFmt.format(weekStart)} – ${dateFmt.format(weekEnd)}`;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-center gap-4 mb-8">
          <a
            href={`/digest?week=${prevWeekParam(weekStart)}`}
            className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
          >
            ←
          </a>
          <span className="font-body text-sm text-ink/60 w-44 text-center">
            {isCurrent ? "This week" : `Week of ${weekLabel}`}
          </span>
          {isCurrent ? (
            <span className="w-6" />
          ) : (
            <a
              href={`/digest?week=${nextWeekParam(weekStart)}`}
              className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
            >
              →
            </a>
          )}
        </div>

        <div className="flex flex-col items-center text-center gap-2 mb-10">
          <p className="font-body text-sm text-sage">
            {isCurrent ? "Spent this week" : "Spent"}
          </p>
          <p className="font-display text-5xl tabular-nums">{formatThb(totalSpent)}</p>
          {totalIncome > 0 && (
            <p className="font-body text-xs text-ink/50">
              Income {formatThb(totalIncome)}
            </p>
          )}
        </div>

        {categoryRows.length > 0 ? (
          <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
            {categoryRows.map(({ name, amount }) => (
              <div key={name} className="flex items-center justify-between px-3 py-2.5">
                <span className="font-body text-sm">{name}</span>
                <span className="font-body tabular-nums text-sm">{formatThb(amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-body text-center text-sm text-ink/60">
            Nothing recorded this week.
          </p>
        )}

        <a
          href="/"
          className="font-body mt-8 block text-center text-sm text-sage underline"
        >
          Back to overview
        </a>
      </div>
    </main>
  );
}
