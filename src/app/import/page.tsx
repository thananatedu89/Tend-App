import { importTransactions } from "./actions";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Import</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          Paste CSV data in the format Tend exports. Category names must match
          exactly (case-insensitive). Unknown categories become uncategorised.
        </p>

        <div className="font-body mb-6 rounded-md border border-mist bg-mist/20 px-3 py-2.5 text-xs text-ink/50 leading-relaxed">
          Date,Type,Category,Amount,Note<br />
          2026-06-15,Expense,Food,599.00,Lunch<br />
          2026-06-10,Income,Salary,50000.00,
        </div>

        <form action={importTransactions} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="csv" className="font-body text-sm text-ink/70">
              CSV data
            </label>
            <textarea
              id="csv"
              name="csv"
              required
              rows={10}
              placeholder="Paste CSV here…"
              className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage resize-none placeholder:text-ink/30"
            />
          </div>

          {error && <p className="font-body text-sm text-ink/70">{error}</p>}

          <button
            type="submit"
            className="font-body mt-2 rounded-md bg-ink px-3 py-2 text-paper transition-opacity hover:opacity-90"
          >
            Import
          </button>
          <a
            href="/transactions"
            className="font-body text-center text-sm text-sage underline"
          >
            Cancel
          </a>
        </form>
      </div>
    </main>
  );
}
