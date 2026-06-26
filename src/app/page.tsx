import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
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

const dayHeading = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const monthHeading = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

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

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount, note, occurred_at, categories(name)")
    .gte("occurred_at", monthStart)
    .lt("occurred_at", nextMonthParam(monthDate))
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: budget } = await supabase
    .from("budgets")
    .select("total_amount")
    .eq("month", monthStart)
    .maybeSingle();

  const spentThisMonth = (transactions ?? [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const incomeThisMonth = (transactions ?? [])
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const leftToSpend = budget ? budget.total_amount - spentThisMonth : null;

  const byDay = new Map<string, typeof transactions>();
  for (const t of transactions ?? []) {
    const key = t.occurred_at;
    byDay.set(key, [...(byDay.get(key) ?? []), t]);
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-body text-sm text-ink/60">
          {userData.user?.email}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="font-body text-sm text-sage underline"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="flex items-center justify-center gap-4 px-6 pb-2">
        <a
          href={`/?month=${prevMonthParam(monthDate)}`}
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
            href={`/?month=${nextMonthParam(monthDate)}`}
            className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
          >
            →
          </a>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <p className="font-body text-sm text-sage">
          {budget ? (viewing ? "Left to spend this month" : "Left to spend") : (viewing ? "Spent this month" : "Spent")}
        </p>
        <p className="font-display text-5xl tabular-nums">
          {formatThb(leftToSpend ?? spentThisMonth)}
        </p>

        {budget && viewing ? (
          <p className="font-body text-sm text-ink/60">
            {paceSignal(spentThisMonth, budget.total_amount, monthProgress())}
          </p>
        ) : !budget && viewing ? (
          <a
            href="/budget"
            className="font-body text-sm text-sage underline"
          >
            Set a budget for this month
          </a>
        ) : null}

        <div className="font-body mt-2 flex gap-4 text-xs text-ink/50">
          <span>Income {formatThb(incomeThisMonth)}</span>
          <span>Spent {formatThb(spentThisMonth)}</span>
        </div>

        {viewing && (
          <div className="mt-2 flex gap-4">
            <a
              href="/transactions/new"
              className="font-body text-sm text-sage underline"
            >
              Add a transaction
            </a>
            {budget && (
              <a href="/budget" className="font-body text-sm text-sage underline">
                Edit budget
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-6 px-6 pb-10">
        {byDay.size === 0 && (
          <p className="font-body text-center text-sm text-ink/60">
            Nothing recorded yet this month.
          </p>
        )}
        {[...byDay.entries()].map(([date, items]) => (
          <div key={date} className="flex flex-col gap-2">
            <p className="font-body text-sm text-ink/60">
              {dayHeading.format(new Date(date))}
            </p>
            <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
              {items?.map((t) => (
                <a
                  key={t.id}
                  href={`/transactions/${t.id}/edit`}
                  className="flex items-center justify-between px-3 py-2 hover:bg-mist/30 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-body text-sm">
                      {t.categories?.name ?? "Uncategorized"}
                    </span>
                    {t.note && (
                      <span className="font-body text-xs text-ink/60">
                        {t.note}
                      </span>
                    )}
                  </div>
                  <span className="font-body tabular-nums text-sm">
                    {t.amount < 0 ? "-" : "+"}
                    {formatThb(Math.abs(t.amount))}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
