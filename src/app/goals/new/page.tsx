import { createGoal } from "../actions";

export default async function NewGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">New goal</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          Name it, set the number, start saving.
        </p>

        <form action={createGoal} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="font-body text-sm text-ink/70">
              Goal name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Japan trip, Emergency fund"
              className="font-body rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage placeholder:text-ink/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="target_amount" className="font-body text-sm text-ink/70">
              Target amount (฿)
            </label>
            <input
              id="target_amount"
              name="target_amount"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              required
              placeholder="0"
              className="font-display tabular-nums text-2xl rounded-xl border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-sage placeholder:text-ink/30"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-ink/60">{error === "invalid" ? "Please fill in all fields." : error}</p>
          )}

          <button
            type="submit"
            className="font-body mt-2 rounded-full bg-ink px-3 py-3.5 text-paper transition-opacity hover:opacity-90"
            style={{ fontSize: "15px", fontWeight: 500 }}
          >
            Create goal
          </button>
          <a href="/goals" className="font-body text-center text-sm text-sage underline">
            Cancel
          </a>
        </form>
      </div>
    </main>
  );
}
