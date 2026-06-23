import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { formatThb } from "@/lib/format";

const dayHeading = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

interface TransactionRow {
  id: string;
  amount: number;
  note: string | null;
  occurred_at: string;
  categories: { name: string } | null;
}

export default async function Home() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount, note, occurred_at, categories(name)")
    .gte("occurred_at", startOfMonth())
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .overrideTypes<TransactionRow[]>();

  const spentThisMonth = (transactions ?? [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

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

      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <p className="font-body text-sm text-sage">Spent this month</p>
        <p className="font-display text-5xl tabular-nums">
          {formatThb(spentThisMonth)}
        </p>
        <a
          href="/transactions/new"
          className="font-body mt-2 text-sm text-sage underline"
        >
          Add a transaction
        </a>
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
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2"
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
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
