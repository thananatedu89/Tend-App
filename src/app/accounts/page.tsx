import { createClient } from "@/lib/supabase/server";
import { createAccount } from "./actions";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .order("name");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Accounts</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          Cash, cards, wallets — however you track the money.
        </p>

        {accounts && accounts.length > 0 && (
          <div className="flex flex-col divide-y divide-mist rounded-md border border-mist mb-8">
            {accounts.map((acc) => (
              <a
                key={acc.id}
                href={`/accounts/${acc.id}/edit`}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-mist/30 transition-colors"
              >
                <span className="font-body text-sm">{acc.name}</span>
                <span className="font-body text-xs text-ink/40">Edit</span>
              </a>
            ))}
          </div>
        )}

        <form action={createAccount} className="flex gap-2">
          <input
            name="name"
            type="text"
            maxLength={100}
            required
            placeholder="New account"
            autoComplete="off"
            className="font-body flex-1 rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage placeholder:text-ink/30"
          />
          <button
            type="submit"
            className="font-body rounded-md bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
          >
            Add
          </button>
        </form>

        {error && (
          <p className="font-body mt-3 text-sm text-ink/70">{error}</p>
        )}

        <a
          href="/categories"
          className="font-body mt-8 block text-center text-sm text-sage underline"
        >
          Back to categories
        </a>
      </div>
    </main>
  );
}
