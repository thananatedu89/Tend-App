import { importTransactions } from "./actions";
import { BackButton } from "@/components/BackButton";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <BackButton />
        <h1 className="font-display text-lg">Import</h1>
      </header>

      <div className="flex flex-col gap-8 px-6 pb-12 max-w-sm">

        {/* Bank statement — primary option */}
        <a
          href="/import/bank"
          className="flex items-center justify-between rounded-2xl border border-mist bg-surface px-5 py-4 hover:bg-mist/20 transition-colors"
        >
          <div className="flex flex-col gap-0.5">
            <p className="font-body text-sm">Bank statement</p>
            <p className="font-body text-xs text-ink/40">
              KBank, SCB, Bangkok Bank, KTB, TTB, Krungsri
            </p>
          </div>
          <span className="font-body text-sm text-ink/40">→</span>
        </a>

        {/* Tend CSV — secondary option */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-body text-sm text-ink/70">Tend CSV</p>
            <p className="font-body text-xs text-ink/40">
              Paste data exported from Tend. Category names must match exactly.
            </p>
          </div>

          <div className="font-body rounded-md border border-mist bg-mist/20 px-3 py-2.5 text-xs text-ink/50 leading-relaxed">
            Date,Type,Category,Amount,Note<br />
            2026-06-15,Expense,Food,599.00,Lunch<br />
            2026-06-10,Income,Salary,50000.00,
          </div>

          <form action={importTransactions} className="flex flex-col gap-4">
            <textarea
              name="csv"
              required
              rows={8}
              placeholder="Paste Tend CSV here…"
              className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage resize-none placeholder:text-ink/30"
            />

            {error && <p className="font-body text-sm text-ink/60">{error}</p>}

            <button
              type="submit"
              className="font-body rounded-full bg-ink px-4 py-3 text-paper text-sm transition-opacity hover:opacity-90"
            >
              Import
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
