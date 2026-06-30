import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { CategoryBadge } from "@/components/CategoryIcon";
import { deleteWallet, leaveWallet, createInvite, removeMember, renameWallet, settleWallet } from "../actions";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default async function WalletDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string; error?: string; settled?: string }>;
}) {
  const { id } = await params;
  const { invite, error, settled } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, name, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!wallet) notFound();

  const isOwner = wallet.owner_id === userData.user.id;

  const { data: myMembership } = await supabase
    .from("wallet_members")
    .select("role")
    .eq("wallet_id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!myMembership && !isOwner) notFound();

  // Last settlement date (transactions since then count toward the current balance)
  const { data: lastSettlement } = await supabase
    .from("wallet_settlements")
    .select("settled_at")
    .eq("wallet_id", id)
    .order("settled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const since = lastSettlement?.settled_at ?? null;

  const [{ data: members }, { data: txns }, { data: invites }] = await Promise.all([
    supabase
      .from("wallet_members")
      .select("user_id, role, joined_at")
      .eq("wallet_id", id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, amount, note, occurred_at, category_id, user_id, categories(name, icon, color)")
      .eq("wallet_id", id)
      .order("occurred_at", { ascending: false })
      .limit(50),
    isOwner
      ? supabase
          .from("wallet_invites")
          .select("id, token, accepted_at, expires_at, created_at")
          .eq("wallet_id", id)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(3)
      : { data: null },
  ]);

  const allTxns = txns ?? [];

  // Transactions since last settlement (for balance calculation)
  const unsettledTxns = since
    ? allTxns.filter((t) => t.occurred_at > since)
    : allTxns;

  // Per-member expense contribution since last settlement
  const memberIds = (members ?? []).map((m) => m.user_id);
  const contributed = new Map<string, number>();
  for (const uid of memberIds) contributed.set(uid, 0);
  for (const t of unsettledTxns) {
    if (t.amount >= 0) continue;
    const prev = contributed.get(t.user_id) ?? 0;
    contributed.set(t.user_id, prev + Math.abs(t.amount));
  }

  const totalUnsettled = [...contributed.values()].reduce((s, v) => s + v, 0);
  const memberCount = memberIds.length;
  const fairShare = memberCount > 0 ? totalUnsettled / memberCount : 0;

  // Net per member: positive = overpaid (others owe them), negative = underpaid (they owe)
  const netBalance = new Map<string, number>();
  for (const [uid, paid] of contributed) {
    netBalance.set(uid, paid - fairShare);
  }

  const myNet = netBalance.get(userData.user.id) ?? 0;
  const hasUnsettledActivity = totalUnsettled > 0;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tend-app-dusky.vercel.app";

  return (
    <main className="flex flex-1 flex-col">
      <header className="px-6 pt-9 pb-4">
        <a href="/wallets" className="font-body text-xs text-ink/40 mb-1 block">← Wallets</a>
        <h1 className="font-display text-3xl">{wallet.name}</h1>
      </header>

      <div className="flex flex-col gap-6 px-6 pb-12">

        {/* Settlement card */}
        {hasUnsettledActivity && memberCount > 1 && (
          <section
            className="rounded-2xl px-5 py-4"
            style={{
              background: myNet >= 0 ? "var(--color-sage-soft)" : "#f5ede4",
              border: `1px solid ${myNet >= 0 ? "var(--color-sage)" : "var(--color-clay)"}`,
            }}
          >
            <p
              className="font-body text-xs uppercase tracking-widest mb-3"
              style={{ color: myNet >= 0 ? "var(--color-sage)" : "var(--color-clay)", opacity: 0.7 }}
            >
              Balance
            </p>

            {/* Member contribution bars */}
            <div className="flex flex-col gap-3 mb-4">
              {memberIds.map((uid) => {
                const paid = contributed.get(uid) ?? 0;
                const pct = totalUnsettled > 0 ? (paid / totalUnsettled) * 100 : 0;
                const isMe = uid === userData.user.id;
                return (
                  <div key={uid}>
                    <div className="flex justify-between mb-1">
                      <span className="font-body text-xs text-ink/60">{isMe ? "You" : "Member"}</span>
                      <span className="font-body text-xs tabular-nums text-ink/60">{formatThb(paid)}</span>
                    </div>
                    <div style={{ height: "5px", borderRadius: "999px", background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: isMe ? "var(--color-sage)" : "var(--color-ink)",
                          opacity: isMe ? 1 : 0.3,
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Net verdict */}
            <div className="flex items-center justify-between gap-3">
              <p className="font-body text-sm">
                {Math.abs(myNet) < 1
                  ? "You're even."
                  : myNet > 0
                  ? <>You&apos;re owed <strong>{formatThb(Math.round(myNet))}</strong></>
                  : <>You owe <strong>{formatThb(Math.round(Math.abs(myNet)))}</strong></>}
              </p>
              <form action={settleWallet}>
                <input type="hidden" name="wallet_id" value={id} />
                <button
                  type="submit"
                  className="font-body text-xs px-3 py-1.5 rounded-full border transition-colors shrink-0"
                  style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)", opacity: 0.5 }}
                >
                  Settle up
                </button>
              </form>
            </div>

            {since && (
              <p className="font-body text-xs text-ink/35 mt-2">
                Since {dateFmt.format(new Date(since))}
              </p>
            )}
          </section>
        )}

        {/* Settled banner */}
        {settled && (
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--color-sage)", background: "var(--color-sage-soft)" }}>
            <p className="font-body text-sm">Settled up — balances reset.</p>
          </div>
        )}

        {/* Invite banner */}
        {invite && (
          <div className="rounded-2xl border px-4 py-3.5" style={{ borderColor: "var(--color-sage)", background: "var(--color-sage-soft)" }}>
            <p className="font-body text-sm font-medium">Invite link created</p>
            <p className="font-body text-xs text-ink/60 mt-0.5 break-all">{appUrl}/wallets/invite/{invite}</p>
            <p className="font-body text-xs text-ink/40 mt-1">Share this link. It expires in 7 days.</p>
          </div>
        )}

        {error && <p className="font-body text-sm text-ink/70">{error}</p>}

        {/* Activity feed */}
        <section>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">Activity</p>
          {allTxns.length > 0 ? (
            <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
              {allTxns.map((t) => {
                const cat = t.categories as { name: string; icon: string | null; color: string | null } | null;
                const isUnsettled = !since || t.occurred_at > since;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3 gap-3"
                    style={{ opacity: isUnsettled ? 1 : 0.45 }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {cat && <CategoryBadge icon={cat.icon} color={cat.color} />}
                      <div className="min-w-0">
                        <p className="font-body text-sm truncate">{t.note ?? cat?.name ?? "Transaction"}</p>
                        <p className="font-body text-xs text-ink/40">
                          {dateFmt.format(new Date(t.occurred_at))}
                          {t.user_id === userData.user.id ? " · You" : " · Member"}
                        </p>
                      </div>
                    </div>
                    <span
                      className="font-body text-sm tabular-nums shrink-0"
                      style={{ color: t.amount < 0 ? "var(--color-ink)" : "var(--color-sage)" }}
                    >
                      {t.amount < 0 ? "-" : "+"}{formatThb(Math.abs(t.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="font-body text-sm text-ink/40">No transactions yet. Add one and tag this wallet.</p>
          )}
        </section>

        {/* Members */}
        <section>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">Members</p>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            {(members ?? []).map((m) => (
              <div key={m.user_id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-body text-sm">{m.user_id === userData.user.id ? "You" : "Member"}</p>
                  <p className="font-body text-xs text-ink/40 capitalize">{m.role}</p>
                </div>
                {isOwner && m.user_id !== userData.user.id && (
                  <form action={removeMember}>
                    <input type="hidden" name="wallet_id" value={id} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button type="submit" className="font-body text-xs text-ink/40 hover:opacity-70 transition-opacity">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Pending invites */}
        {isOwner && invites && invites.length > 0 && (
          <section>
            <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">Pending invites</p>
            <div className="flex flex-col gap-2">
              {invites.map((inv) => (
                <div key={inv.id} className="rounded-xl border border-mist px-4 py-3">
                  <p className="font-body text-xs text-ink/50 break-all">{appUrl}/wallets/invite/{inv.token}</p>
                  <p className="font-body text-xs text-ink/30 mt-1">Expires {dateFmt.format(new Date(inv.expires_at))}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <section className="flex flex-col gap-3">
          <form action={createInvite}>
            <input type="hidden" name="wallet_id" value={id} />
            <button
              type="submit"
              className="font-body w-full rounded-full bg-ink text-paper text-center transition-opacity hover:opacity-90"
              style={{ padding: "15px", fontSize: "15px", fontWeight: 500, display: "block" }}
            >
              Create invite link
            </button>
          </form>

          {isOwner && (
            <details>
              <summary className="font-body text-sm text-center text-sage underline cursor-pointer list-none">
                Rename wallet
              </summary>
              <form action={renameWallet} className="flex gap-2 mt-3">
                <input type="hidden" name="id" value={id} />
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={wallet.name}
                  maxLength={50}
                  className="font-body flex-1 rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage"
                />
                <button type="submit" className="font-body rounded-md bg-ink px-4 py-2 text-sm text-paper">Save</button>
              </form>
            </details>
          )}

          {!isOwner && (
            <form action={leaveWallet}>
              <input type="hidden" name="wallet_id" value={id} />
              <button type="submit" className="font-body w-full text-center text-sm text-ink/40 underline">
                Leave wallet
              </button>
            </form>
          )}

          {isOwner && (
            <form action={deleteWallet}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="font-body w-full text-center text-sm text-ink/40 underline">
                Delete wallet
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
