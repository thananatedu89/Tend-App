import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { addSavings, deleteGoal, updateGoal, removeDeposit } from "../actions";
import { GoalChips } from "@/components/GoalChips";
import { ConfirmButton } from "@/components/ConfirmButton";

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function GoalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const [{ data: goal }, { data: deposits }] = await Promise.all([
    supabase
      .from("goals")
      .select("id, name, target_amount, saved_amount, created_at")
      .eq("id", id)
      .single(),
    supabase
      .from("goal_deposits")
      .select("id, amount, note, occurred_at")
      .eq("goal_id", id)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!goal) notFound();

  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
  const pct = goal.target_amount > 0
    ? Math.min(100, (goal.saved_amount / goal.target_amount) * 100)
    : 0;
  const done = remaining === 0;
  const isEditing = edit === "1";
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <main className="flex flex-1 flex-col">
      <header className="px-6 pt-9 pb-2 flex items-center justify-between">
        <a href="/goals" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">← Goals</a>
        {!isEditing && (
          <a href={`/goals/${goal.id}?edit=1`} className="font-body text-xs text-sage">Edit</a>
        )}
      </header>

      {/* Inline edit form */}
      {isEditing ? (
        <div className="px-6 pt-6 pb-8">
          <h2 className="font-display text-2xl mb-6">Edit goal</h2>
          <form action={updateGoal} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={goal.id} />
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-sm text-ink/70">Name</label>
              <input
                name="name"
                type="text"
                required
                defaultValue={goal.name}
                autoFocus
                className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-sm text-ink/70">Target (฿)</label>
              <input
                name="target_amount"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                required
                defaultValue={goal.target_amount}
                className="font-display tabular-nums text-2xl rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage"
              />
            </div>
            <button type="submit" className="font-body rounded-full bg-ink px-3 py-3 text-paper transition-opacity hover:opacity-90" style={{ fontSize: "15px", fontWeight: 500 }}>
              Save changes
            </button>
            <a href={`/goals/${goal.id}`} className="font-body text-center text-sm text-sage underline">Cancel</a>
          </form>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="px-6 pt-6 pb-8">
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-ink)", opacity: 0.4 }}>
              {goal.name}
            </p>
            <p className="font-display tabular-nums" style={{ fontSize: "48px", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.02, margin: "8px 0 6px" }}>
              {done ? formatThb(goal.saved_amount) : formatThb(remaining)}
            </p>
            <p style={{ fontSize: "14.5px", color: "var(--color-ink)", opacity: 0.55, lineHeight: 1.5 }}>
              {done ? "Goal reached." : `${formatThb(goal.saved_amount)} saved of ${formatThb(goal.target_amount)}`}
            </p>
            <div className="mt-5">
              <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-mist)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-sage)", borderRadius: "999px", transition: "width .3s ease" }} />
              </div>
              <div className="flex justify-between mt-2" style={{ fontSize: "12px", color: "var(--color-ink)", opacity: 0.4 }}>
                <span className="tabular-nums">{Math.round(pct)}% there</span>
                <span className="tabular-nums">{formatThb(goal.target_amount)} target</span>
              </div>
            </div>
          </div>

          {/* Add deposit */}
          {!done && (
            <div className="px-6 pb-8">
              <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">Add deposit</p>
              <form action={addSavings} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={goal.id} />
                <input
                  id="deposit-amount"
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="0.01"
                  required
                  placeholder="Amount (฿)"
                  className="font-display tabular-nums w-full rounded-xl border border-mist bg-paper px-4 py-3 text-ink outline-none focus:border-sage placeholder:text-ink/30 text-2xl"
                />
                <GoalChips targetId="deposit-amount" />
                <input
                  name="note"
                  type="text"
                  placeholder="Note (optional)"
                  className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-sage placeholder:text-ink/30"
                />
                <input
                  name="occurred_at"
                  type="date"
                  defaultValue={todayStr}
                  className="font-body rounded-xl border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage"
                />
                <button
                  type="submit"
                  className="font-body rounded-full bg-ink text-paper px-3 py-3 transition-opacity hover:opacity-90"
                  style={{ fontSize: "15px", fontWeight: 500 }}
                >
                  Save deposit
                </button>
              </form>
            </div>
          )}

          {/* Deposit history */}
          {(deposits ?? []).length > 0 && (
            <div className="px-6 pb-8">
              <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">History</p>
              <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist overflow-hidden">
                {(deposits ?? []).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-body text-sm truncate">{d.note ?? goal.name}</span>
                      <span className="font-body text-xs text-ink/40">
                        {dayFmt.format(new Date(d.occurred_at + "T12:00:00"))}
                      </span>
                    </div>
                    <span className="font-body tabular-nums text-sm shrink-0" style={{ color: "var(--color-sage)" }}>
                      +{formatThb(d.amount)}
                    </span>
                    <form action={removeDeposit}>
                      <input type="hidden" name="deposit_id" value={d.id} />
                      <input type="hidden" name="goal_id" value={goal.id} />
                      <ConfirmButton
                        confirmLabel="Remove"
                        className="font-body text-sm text-ink/25 hover:text-ink/60 transition-colors pl-1"
                      >
                        ×
                      </ConfirmButton>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete goal */}
      {!isEditing && (
        <div className="px-6 pb-12 mt-auto">
          <form action={deleteGoal}>
            <input type="hidden" name="id" value={goal.id} />
            <ConfirmButton className="font-body text-sm text-ink/30 hover:text-ink/60 transition-colors">
              Delete this goal
            </ConfirmButton>
          </form>
        </div>
      )}
    </main>
  );
}
