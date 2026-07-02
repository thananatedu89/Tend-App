"use client";

import { useState, useTransition } from "react";
import { parseBankCSV, type ParseResult } from "@/lib/bank-parser";
import { importBankStatement } from "./actions";
import { useSearchParams } from "next/navigation";

function formatThb(n: number): string {
  return "฿" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BankImportPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setCsv(value);
    if (value.trim().length > 30) {
      setPreview(parseBankCSV(value));
    } else {
      setPreview(null);
    }
  }

  const previewRows = preview?.rows.slice(0, 8) ?? [];
  const hasData = (preview?.rows.length ?? 0) > 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <a href="/import" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">
          ←
        </a>
        <h1 className="font-display text-lg">Bank statement</h1>
      </header>

      <div className="flex flex-col gap-6 px-6 pb-12 max-w-lg">
        <p className="font-body text-sm text-ink/60">
          Paste a CSV export from your bank. Supports KBank, SCB, Bangkok Bank, KTB, TTB, Krungsri, and most standard formats.
          Imported transactions are uncategorised — you can sort them after.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="csv-input" className="font-body text-sm text-ink/70">
            CSV data
          </label>
          <textarea
            id="csv-input"
            value={csv}
            onChange={(e) => handleChange(e.target.value)}
            rows={8}
            placeholder="Paste your bank's CSV export here…"
            className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage resize-none placeholder:text-ink/30"
          />
        </div>

        {/* Live preview */}
        {preview && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-body text-xs uppercase tracking-widest text-ink/40">Preview</p>
              <p className="font-body text-xs text-ink/40">
                {preview.bank} · {preview.rows.length} transaction{preview.rows.length !== 1 ? "s" : ""}
                {preview.skipped > 0 ? ` · ${preview.skipped} skipped` : ""}
              </p>
            </div>

            {hasData ? (
              <>
                <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
                  {previewRows.map((row, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex flex-col min-w-0">
                        <span className="font-body text-sm truncate">
                          {row.description || "—"}
                        </span>
                        <span className="font-body text-xs text-ink/40">{row.date}</span>
                      </div>
                      <span className={`font-body tabular-nums text-sm shrink-0 ml-3 ${row.amount > 0 ? "text-sage" : ""}`}>
                        {row.amount < 0 ? "−" : "+"}{formatThb(row.amount)}
                      </span>
                    </div>
                  ))}
                  {preview.rows.length > 8 && (
                    <div className="px-4 py-3">
                      <p className="font-body text-xs text-ink/40">
                        + {preview.rows.length - 8} more
                      </p>
                    </div>
                  )}
                </div>

                <form
                  action={importBankStatement}
                  onSubmit={() => startTransition(() => {})}
                >
                  <input type="hidden" name="csv" value={csv} />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="font-body w-full rounded-full bg-ink px-4 py-3 text-paper text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending ? "Importing…" : `Import ${preview.rows.length} transactions`}
                  </button>
                </form>
              </>
            ) : (
              <p className="font-body text-sm text-ink/50">
                No transactions found. Make sure the CSV has date, description, and amount columns.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="font-body text-sm text-ink/60">{decodeURIComponent(error)}</p>
        )}
      </div>
    </main>
  );
}
