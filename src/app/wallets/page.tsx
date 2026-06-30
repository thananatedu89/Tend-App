import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createWallet } from "./actions";

export default async function WalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: memberships } = await supabase
    .from("wallet_members")
    .select("wallet_id, role")
    .eq("user_id", userData.user.id);

  const walletIds = (memberships ?? []).map((m) => m.wallet_id);

  const { data: wallets } = walletIds.length
    ? await supabase
        .from("wallets")
        .select("id, name, owner_id, created_at")
        .in("id", walletIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const roleMap = new Map((memberships ?? []).map((m) => [m.wallet_id, m.role]));

  return (
    <main className="flex flex-1 flex-col">
      <header className="px-6 pt-9 pb-6">
        <h1 className="font-display text-3xl">Shared wallets</h1>
        <p className="font-body text-sm text-ink/50 mt-1">
          Track expenses together with others.
        </p>
      </header>

      <div className="flex flex-col gap-4 px-6 pb-10">
        {wallets && wallets.length > 0 ? (
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            {wallets.map((w) => (
              <a
                key={w.id}
                href={`/wallets/${w.id}`}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-mist/30 transition-colors"
              >
                <div>
                  <p className="font-body text-sm">{w.name}</p>
                  <p className="font-body text-xs text-ink/40 mt-0.5">
                    {roleMap.get(w.id) === "owner" ? "You own this" : "Member"}
                  </p>
                </div>
                <span className="font-body text-xs text-ink/40">→</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" className="text-ink/15">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
              <path d="M7 15h2"/>
              <path d="M11 15h6"/>
            </svg>
            <div className="text-center">
              <p className="font-body text-sm text-ink/50">No shared wallets yet.</p>
              <p className="font-body text-xs text-ink/35 mt-1">Create one to split expenses with a partner, flatmate, or anyone.</p>
            </div>
          </div>
        )}

        <form action={createWallet} className="flex gap-2 mt-2">
          <input
            name="name"
            type="text"
            required
            maxLength={50}
            placeholder="Wallet name (e.g. Household)"
            autoComplete="off"
            className="font-body flex-1 rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage placeholder:text-ink/30"
          />
          <button
            type="submit"
            className="font-body rounded-md bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90 shrink-0"
          >
            Create
          </button>
        </form>

        {error && <p className="font-body text-sm text-ink/70">{error}</p>}

        <a href="/settings" className="font-body text-center text-sm text-sage underline mt-4">
          Back to settings
        </a>
      </div>
    </main>
  );
}
