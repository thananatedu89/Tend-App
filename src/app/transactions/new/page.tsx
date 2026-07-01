import { createClient } from "@/lib/supabase/server";
import { createTransaction, deleteTemplate } from "../actions";
import { formatThb } from "@/lib/format";
import { NoteInput } from "@/components/NoteInput";
import { catOptionLabel } from "@/components/CategoryIcon";
import { ReceiptUpload } from "@/components/ReceiptUpload";
import { AutoCategorize } from "@/components/AutoCategorize";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string; template?: string }>;
}) {
  const { error, from: fromId, template: templateId } = await searchParams;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const [{ data: categories }, { data: accounts }, { data: recentNotes }, { data: walletMemberships }, { data: templates }] =
    await Promise.all([
      supabase.from("categories").select("id, name, icon").order("name"),
      supabase.from("accounts").select("id, name").order("name"),
      supabase
        .from("transactions")
        .select("note, category_id")
        .not("note", "is", null)
        .order("occurred_at", { ascending: false })
        .limit(150),
      userId
        ? supabase.from("wallet_members").select("wallet_id").eq("user_id", userId)
        : { data: [] },
      userId
        ? supabase.from("transaction_templates").select("id, name, amount, category_id, account_id, note").eq("user_id", userId).order("created_at", { ascending: false }).limit(10)
        : { data: [] },
    ]);

  const walletIds = (walletMemberships ?? []).map((m) => m.wallet_id);
  const { data: wallets } = walletIds.length
    ? await supabase.from("wallets").select("id, name").in("id", walletIds).order("name")
    : { data: [] };

  const today = new Date().toISOString().slice(0, 10);

  // Pre-fill from a previous transaction or saved template
  let prefill: {
    amount: number;
    categoryId: string | null;
    accountId: string | null;
    note: string | null;
  } | null = null;

  if (templateId) {
    const tmpl = (templates ?? []).find((t) => t.id === templateId);
    if (tmpl) {
      prefill = {
        amount: tmpl.amount,
        categoryId: tmpl.category_id,
        accountId: tmpl.account_id,
        note: tmpl.note,
      };
    }
  } else if (fromId) {
    const { data: source } = await supabase
      .from("transactions")
      .select("amount, category_id, account_id, note")
      .eq("id", fromId)
      .maybeSingle();
    if (source) {
      prefill = {
        amount: Math.abs(source.amount),
        categoryId: source.category_id,
        accountId: source.account_id,
        note: source.note,
      };
    }
  }

  // Note suggestions: recent distinct notes for the prefilled category
  const notesByCategory = new Map<string, string[]>();
  for (const t of recentNotes ?? []) {
    if (!t.note) continue;
    const key = t.category_id ?? "__none__";
    const arr = notesByCategory.get(key) ?? [];
    if (!arr.includes(t.note) && arr.length < 8) arr.push(t.note);
    notesByCategory.set(key, arr);
  }
  const noteSuggestions = prefill?.categoryId
    ? (notesByCategory.get(prefill.categoryId) ?? [])
    : [];

  // Recurring suggestions: expenses seen more than once in the last 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: recentTxns } = await supabase
    .from("transactions")
    .select("id, amount, note, category_id, categories(name, icon)")
    .lt("amount", 0)
    .gte("occurred_at", sinceStr)
    .order("occurred_at", { ascending: false });

  type Suggestion = {
    id: string;
    count: number;
    amount: number;
    note: string | null;
    categoryId: string | null;
    categoryName: string | null;
    categoryIcon: string | null;
  };

  const groups = new Map<string, Suggestion>();
  for (const t of recentTxns ?? []) {
    const key = `${t.category_id}|${t.note ?? ""}|${t.amount}`;
    const g = groups.get(key);
    if (g) {
      g.count++;
    } else {
      groups.set(key, {
        id: t.id,
        count: 1,
        amount: t.amount,
        note: t.note,
        categoryId: t.category_id,
        categoryName: t.categories?.name ?? null,
        categoryIcon: t.categories?.icon ?? null,
      });
    }
  }

  const suggestions = [...groups.values()]
    .filter((g) => g.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const catLabel = (name: string | null, icon: string | null) =>
    catOptionLabel(name, icon);

  return (
    <main className="flex flex-1 flex-col justify-end min-h-screen bg-ink/20">
      <div className="w-full bg-surface rounded-t-3xl px-6 pt-4 pb-10 overflow-y-auto max-h-[92svh]">
        {/* Drag handle */}
        <div className="flex justify-center mb-5">
          <span className="block w-10 h-1 rounded-full bg-mist" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl">Add a transaction</h1>
          <a href="/" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">
            Cancel
          </a>
        </div>

        {/* Saved templates */}
        {!prefill && templates && templates.length > 0 && (
          <div className="flex flex-col gap-2 mb-6">
            <p className="font-body text-xs text-ink/40">Quick templates</p>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-0.5">
                  <a
                    href={`/transactions/new?template=${t.id}`}
                    className="font-body text-sm rounded-l-full border border-r-0 border-mist px-3 py-1.5 text-ink/70 hover:border-sage hover:text-sage transition-colors"
                  >
                    {t.name}
                    <span className="tabular-nums ml-1.5 text-xs text-ink/40">{formatThb(t.amount)}</span>
                  </a>
                  <form action={deleteTemplate}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="font-body text-xs border border-mist rounded-r-full px-2 py-1.5 text-ink/30 hover:text-ink/60 hover:border-ink/30 transition-colors"
                      title="Remove template"
                    >
                      ×
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recurring suggestions — hidden when pre-filling */}
        {!prefill && suggestions.length > 0 && (
          <div className="flex flex-col gap-2 mb-8">
            <p className="font-body text-xs text-ink/40">Repeat a recent expense</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <a
                  key={s.id}
                  href={`/transactions/new?from=${s.id}`}
                  className="font-body text-sm rounded-full border border-mist px-3 py-1 text-ink/70 hover:border-ink/30 transition-colors"
                >
                  {catLabel(s.categoryName, s.categoryIcon)}
                  {s.note ? ` · ${s.note}` : ""}
                  <span className="tabular-nums ml-1.5 text-ink/50">
                    {formatThb(s.amount)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {!categories?.length ? (
          <p className="font-body text-sm text-ink/60">
            No categories yet — try refreshing in a moment.
          </p>
        ) : (
          <form action={createTransaction} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <label className="flex-1">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  defaultChecked
                  className="peer sr-only"
                />
                <span className="block cursor-pointer rounded-xl border border-mist px-3 py-2 text-center font-body text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                  Expense
                </span>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  className="peer sr-only"
                />
                <span className="block cursor-pointer rounded-xl border border-mist px-3 py-2 text-center font-body text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                  Income
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="amount" className="font-body text-sm text-ink/70">
                Amount (฿)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                autoFocus
                defaultValue={prefill?.amount ?? undefined}
                className="font-display tabular-nums text-2xl rounded-xl border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="category_id"
                className="font-body text-sm text-ink/70"
              >
                Category
              </label>
              <select
                id="category_id"
                name="category_id"
                required
                defaultValue={prefill?.categoryId ?? ""}
                className="font-body rounded-xl border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
              >
                {!prefill && <option value="" disabled>Select a category</option>}
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {catLabel(c.name, c.icon)}
                  </option>
                ))}
              </select>
            </div>

            {accounts && accounts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="account_id"
                  className="font-body text-sm text-ink/70"
                >
                  Account (optional)
                </label>
                <select
                  id="account_id"
                  name="account_id"
                  defaultValue={prefill?.accountId ?? ""}
                  className="font-body rounded-xl border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
                >
                  <option value="">No account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="occurred_at"
                className="font-body text-sm text-ink/70"
              >
                Date
              </label>
              <input
                id="occurred_at"
                name="occurred_at"
                type="date"
                defaultValue={today}
                required
                className="font-body rounded-xl border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="note" className="font-body text-sm text-ink/70">
                Note (optional)
              </label>
              <NoteInput
                defaultValue={prefill?.note ?? ""}
                suggestions={noteSuggestions}
              />
              {!prefill && (
                <AutoCategorize
                  categories={(categories ?? []).map(c => ({ id: c.id, name: c.name }))}
                />
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_recurring"
                value="1"
                className="w-4 h-4 rounded border-mist accent-sage"
              />
              <span className="font-body text-sm text-ink/70">Recurring (monthly)</span>
            </label>

            {wallets && wallets.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="wallet_id" className="font-body text-sm text-ink/70">
                  Shared wallet (optional)
                </label>
                <select
                  id="wallet_id"
                  name="wallet_id"
                  className="font-body rounded-xl border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
                >
                  <option value="">Personal</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            <ReceiptUpload />

            {error && <p className="font-body text-sm text-ink/70">{error}</p>}

            <button
              type="submit"
              className="font-body mt-2 rounded-full bg-ink px-3 py-3 text-paper transition-opacity hover:opacity-90"
            >
              Add
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
