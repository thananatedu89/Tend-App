import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { startCheckout, openPortal } from "./actions";

const benefits = [
  "Connect bank accounts for automatic sync",
  "Unlimited budgets and category tracking",
  "Shared budgets with a partner or household",
  "Calm spending insights and trend reports",
  "Export your data anytime, in any format",
];

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/upgrade");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("subscription_tier, subscription_status, subscription_interval, subscription_end_at")
    .eq("id", user.id)
    .maybeSingle();

  const isPlus = profile?.subscription_tier === "plus";
  const isLifetime = profile?.subscription_interval === "lifetime";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-10 py-10">

        {/* Success banner */}
        {success && (
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--color-sage)", background: "var(--color-sage-soft)" }}>
            <p className="font-body text-sm font-medium">Welcome to Tend Plus.</p>
            <p className="font-body text-xs text-ink/60 mt-0.5">Your subscription is now active.</p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-3 text-center">
          <h1 className="font-display text-3xl">
            {isPlus ? "You're on Tend Plus." : "More clarity,\nwhen you want it."}
          </h1>
          <p className="font-body text-sm text-ink/60">
            {isPlus
              ? isLifetime
                ? "You have lifetime access — thanks for supporting Tend."
                : `Plan: ${profile?.subscription_interval === "annual" ? "Annual" : "Monthly"} · Status: ${profile?.subscription_status ?? "active"}`
              : "Tend Free covers the essentials. Plus adds the tools for a fuller picture."}
          </p>
        </div>

        {/* Benefits */}
        <ul className="flex flex-col gap-3">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full shrink-0" style={{ background: "var(--color-sage-soft)", color: "var(--color-sage)" }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              </span>
              <span className="font-body text-sm">{b}</span>
            </li>
          ))}
        </ul>

        {isPlus ? (
          /* Already subscribed — manage billing */
          <div className="flex flex-col gap-3 items-center">
            <form action={openPortal}>
              <button
                type="submit"
                className="font-body w-full rounded-full bg-ink px-4 py-3 text-paper text-sm transition-opacity hover:opacity-90"
              >
                Manage billing
              </button>
            </form>
            <a href="/settings" className="font-body text-sm text-ink/50 hover:text-ink/70 transition-colors">
              Back to settings
            </a>
          </div>
        ) : (
          /* Pricing options */
          <>
            <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="font-body text-sm">Tend Plus — Monthly</p>
                  <p className="font-body text-xs text-ink/50">Billed monthly</p>
                </div>
                <p className="font-display text-lg tabular-nums">฿99<span className="font-body text-xs text-ink/40">/mo</span></p>
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="font-body text-sm">Tend Plus — Annual</p>
                  <p className="font-body text-xs text-ink/50">Save 25%</p>
                </div>
                <p className="font-display text-lg tabular-nums">฿890<span className="font-body text-xs text-ink/40">/yr</span></p>
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="font-body text-sm">Tend Forever</p>
                  <p className="font-body text-xs text-ink/50">One-time, yours permanently</p>
                </div>
                <p className="font-display text-lg tabular-nums">฿2,490</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <form action={startCheckout}>
                <input type="hidden" name="plan" value="annual" />
                <button
                  type="submit"
                  className="font-body w-full rounded-full bg-ink px-4 py-3 text-paper text-sm transition-opacity hover:opacity-90"
                >
                  Get Tend Plus — Annual
                </button>
              </form>
              <form action={startCheckout}>
                <input type="hidden" name="plan" value="monthly" />
                <button
                  type="submit"
                  className="font-body w-full rounded-full border border-ink/20 px-4 py-3 text-ink text-sm transition-opacity hover:opacity-70"
                >
                  Monthly plan
                </button>
              </form>
              <form action={startCheckout}>
                <input type="hidden" name="plan" value="lifetime" />
                <button
                  type="submit"
                  className="font-body w-full text-center text-sm transition-colors"
                  style={{ color: "var(--color-sage)" }}
                >
                  Or get Tend Forever (one-time ฿2,490)
                </button>
              </form>
            </div>

            <a href="/settings" className="font-body text-center text-sm text-ink/40 hover:text-ink/60 transition-colors -mt-6">
              Maybe later
            </a>
          </>
        )}

        <p className="font-body text-xs text-ink/40 text-center -mt-4">
          Purchases are processed securely by Stripe. Cancel any time.
        </p>

      </div>
    </main>
  );
}
