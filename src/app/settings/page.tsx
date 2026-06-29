import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { ThemeToggle } from "@/components/ThemeToggle";

function Row({
  href,
  label,
  hint,
  external,
}: {
  href: string;
  label: string;
  hint?: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center justify-between px-4 py-3.5 hover:bg-mist/30 transition-colors"
    >
      <span className="font-body text-sm">{label}</span>
      <span className="font-body text-xs text-ink/40">{hint ?? "→"}</span>
    </a>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const [{ count: catCount }, { count: acctCount }] = await Promise.all([
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("accounts").select("*", { count: "exact", head: true }),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <header className="px-6 py-6">
        <h1 className="font-display text-3xl">You</h1>
      </header>

      <div className="flex flex-col gap-6 px-6 pb-12">

        {/* Profile */}
        <section>
          <div className="flex items-center gap-4 rounded-2xl border border-mist bg-surface px-4 py-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sage-soft text-sage shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <div>
              <p className="font-body text-sm">{userData.user.email}</p>
              <p className="font-body text-xs text-ink/40">Tend account</p>
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
            Subscription
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="font-body text-sm">Tend Free</span>
              <span className="font-body text-xs text-ink/40">Current plan</span>
            </div>
            <a
              href="/upgrade"
              className="flex items-center justify-between px-4 py-3.5 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm text-sage">Upgrade to Tend Plus</span>
              <span className="font-body text-xs text-sage">→</span>
            </a>
          </div>
        </section>

        {/* Accounts */}
        <section>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
            Accounts
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            <Row href="/accounts" label="Manage accounts" hint={`${acctCount ?? 0} →`} />
          </div>
        </section>

        {/* Notifications */}
        <section>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
            Notifications
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="font-body text-sm">Weekly digest</p>
                <p className="font-body text-xs text-ink/50">A calm summary every Sunday</p>
              </div>
              <span className="font-body text-xs text-ink/40">Off</span>
            </div>
            <Row href="/digest" label="View this week's digest" />
          </div>
        </section>

        {/* Privacy & security */}
        <section>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
            Privacy &amp; security
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            <div className="px-4 py-3.5">
              <p className="font-body text-sm text-ink/60">
                No ads. No data selling. Ever.
              </p>
            </div>
            <Row href="/import" label="Import CSV" />
            <a
              href="/api/export"
              className="flex items-center justify-between px-4 py-3.5 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm">Export my data</span>
              <span className="font-body text-xs text-ink/40">↓ CSV</span>
            </a>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
            Appearance
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="font-body text-sm shrink-0">Theme</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="font-body text-sm">Currency</span>
              <span className="font-body text-xs text-ink/40">฿ THB</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="font-body text-sm">Language</span>
              <span className="font-body text-xs text-ink/40">English</span>
            </div>
          </div>
        </section>

        {/* Organize */}
        <section>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
            Organize
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            <Row href="/categories" label="Categories" hint={`${catCount ?? 0} →`} />
            <Row href="/budget" label="Budget" />
          </div>
        </section>

        {/* Reports */}
        <section>
          <p className="font-body text-xs uppercase tracking-widest text-ink/40 mb-3">
            Reports
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            <Row href="/report" label="Monthly report" />
            <Row href="/year" label="Year overview" />
            <Row href="/insights" label="Insights" />
            <Row href="/calendar" label="Calendar" />
          </div>
        </section>

        {/* Account actions */}
        <section>
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
            <form action={signOut}>
              <button
                type="submit"
                className="w-full text-left font-body text-sm px-4 py-3.5 text-ink/60 hover:bg-mist/30 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </section>

      </div>
    </main>
  );
}
