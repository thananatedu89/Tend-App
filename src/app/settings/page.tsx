import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

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
      <header className="flex items-center gap-4 px-6 py-4">
        <a
          href="/"
          className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
        >
          ←
        </a>
        <h1 className="font-display text-lg">Settings</h1>
      </header>

      <div className="flex flex-col gap-6 px-6 pb-12">
        <section>
          <p className="font-body text-xs uppercase tracking-wide text-ink/40 mb-3">
            Organize
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
            <a
              href="/categories"
              className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm">Categories</span>
              <span className="font-body text-xs text-ink/40">
                {catCount ?? 0} →
              </span>
            </a>
            <a
              href="/accounts"
              className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm">Accounts</span>
              <span className="font-body text-xs text-ink/40">
                {acctCount ?? 0} →
              </span>
            </a>
            <a
              href="/budget"
              className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm">Budget</span>
              <span className="font-body text-xs text-ink/40">→</span>
            </a>
          </div>
        </section>

        <section>
          <p className="font-body text-xs uppercase tracking-wide text-ink/40 mb-3">
            Reports
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
            <a
              href="/report"
              className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm">Monthly report</span>
              <span className="font-body text-xs text-ink/40">→</span>
            </a>
            <a
              href="/year"
              className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm">Year overview</span>
              <span className="font-body text-xs text-ink/40">→</span>
            </a>
            <a
              href="/insights"
              className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm">Insights</span>
              <span className="font-body text-xs text-ink/40">→</span>
            </a>
          </div>
        </section>

        <section>
          <p className="font-body text-xs uppercase tracking-wide text-ink/40 mb-3">
            Data
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
            <a
              href="/import"
              className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm">Import CSV</span>
              <span className="font-body text-xs text-ink/40">→</span>
            </a>
            <a
              href="/api/export"
              className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
            >
              <span className="font-body text-sm">Export CSV</span>
              <span className="font-body text-xs text-ink/40">↓</span>
            </a>
          </div>
        </section>

        <section>
          <p className="font-body text-xs uppercase tracking-wide text-ink/40 mb-3">
            Account
          </p>
          <div className="flex flex-col divide-y divide-mist rounded-md border border-mist">
            <div className="flex items-center px-4 py-3">
              <span className="font-body text-xs text-ink/50">
                {userData.user.email}
              </span>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full text-left font-body text-sm px-4 py-3 text-sage hover:bg-mist/30 transition-colors"
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
