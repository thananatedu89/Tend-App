import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: goals } = await supabase
    .from("goals")
    .select("id, name, target_amount, saved_amount")
    .order("created_at", { ascending: true });

  const list = goals ?? [];
  const totalSaved = list.reduce((s, g) => s + g.saved_amount, 0);
  const totalTarget = list.reduce((s, g) => s + g.target_amount, 0);

  return (
    <main className="flex flex-1 flex-col">
      <header className="px-6 pt-9 pb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl">Goals</h1>
          {list.length > 0 && (
            <p className="font-body text-sm text-ink/50 mt-1">
              {formatThb(totalSaved)} saved of {formatThb(totalTarget)}
            </p>
          )}
        </div>
        <a href="/budget" className="font-body text-xs text-ink/40 hover:text-ink/70 transition-colors mt-2">
          Budget →
        </a>
      </header>

      <div className="flex flex-col gap-4 px-6 pb-10">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" className="text-ink/15">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
            <div className="text-center">
              <p className="font-body text-sm text-ink/50">No goals yet.</p>
              <p className="font-body text-xs text-ink/35 mt-1 max-w-xs">A trip, an emergency fund, anything worth saving for.</p>
            </div>
          </div>
        ) : (
          list.map((goal) => {
            const pct = goal.target_amount > 0
              ? Math.min(100, (goal.saved_amount / goal.target_amount) * 100)
              : 0;
            const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
            const done = remaining === 0;
            return (
              <a
                key={goal.id}
                href={`/goals/${goal.id}`}
                className="block rounded-2xl border border-mist bg-surface px-5 py-4 hover:bg-mist/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-body text-sm">{goal.name}</p>
                    <p className="font-body text-xs text-ink/40 mt-0.5 tabular-nums">
                      {formatThb(goal.saved_amount)} of {formatThb(goal.target_amount)}
                    </p>
                  </div>
                  <span
                    className="font-body text-xs tabular-nums"
                    style={{ color: done ? "var(--color-sage)" : "var(--color-ink)", opacity: done ? 1 : 0.4 }}
                  >
                    {done ? "Reached" : `${Math.round(pct)}%`}
                  </span>
                </div>
                <div style={{ height: "5px", borderRadius: "999px", background: "var(--color-mist)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: done ? "var(--color-sage)" : "var(--color-sage)",
                      borderRadius: "999px",
                      transition: "width .3s ease",
                    }}
                  />
                </div>
                {!done && (
                  <p className="font-body text-xs text-ink/40 mt-2 tabular-nums">
                    {formatThb(remaining)} to go
                  </p>
                )}
              </a>
            );
          })
        )}

        <a
          href="/goals/new"
          className="font-body w-full rounded-full bg-ink text-paper text-center transition-opacity hover:opacity-90 mt-2"
          style={{ padding: "15px", fontSize: "15px", fontWeight: 500, display: "block" }}
        >
          New goal
        </a>
      </div>
    </main>
  );
}
