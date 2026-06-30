import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "../../actions";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: invite } = await supabase
    .from("wallet_invites")
    .select("wallet_id, accepted_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  let walletName = "a shared wallet";
  if (invite?.wallet_id) {
    const { data: w } = await supabase.from("wallets").select("name").eq("id", invite.wallet_id).maybeSingle();
    if (w) walletName = w.name;
  }

  const expired = invite && new Date(invite.expires_at) < new Date();
  const already = invite?.accepted_at != null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {!invite || expired ? (
          <>
            <h1 className="font-display text-3xl mb-3">Invite not valid</h1>
            <p className="font-body text-sm text-ink/60 mb-8">
              {expired ? "This invite link has expired." : "This invite link doesn't exist."}
            </p>
            <a href="/" className="font-body text-sm text-sage underline">Go home</a>
          </>
        ) : already ? (
          <>
            <h1 className="font-display text-3xl mb-3">Already joined</h1>
            <p className="font-body text-sm text-ink/60 mb-8">
              This invite has already been used.
            </p>
            <a href={`/wallets/${invite.wallet_id}`} className="font-body text-sm text-sage underline">
              Open wallet →
            </a>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-sage-soft mx-auto mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sage">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <path d="M2 10h20"/>
              </svg>
            </div>
            <h1 className="font-display text-3xl mb-2">You&apos;re invited</h1>
            <p className="font-body text-sm text-ink/60 mb-8">
              Join <strong>{walletName}</strong> to share and track expenses together.
            </p>

            {userData.user ? (
              <form action={acceptInvite}>
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  className="font-body w-full rounded-full bg-ink text-paper transition-opacity hover:opacity-90"
                  style={{ padding: "15px", fontSize: "15px", fontWeight: 500 }}
                >
                  Join wallet
                </button>
              </form>
            ) : (
              <>
                <p className="font-body text-sm text-ink/60 mb-6">
                  Sign in first to accept this invite.
                </p>
                <a
                  href={`/login?next=/wallets/invite/${token}`}
                  className="font-body block w-full rounded-full bg-ink text-paper text-center transition-opacity hover:opacity-90"
                  style={{ padding: "15px", fontSize: "15px", fontWeight: 500 }}
                >
                  Sign in
                </a>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
