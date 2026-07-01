import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatThb } from "@/lib/format";
import { getSubscriptions } from "@/lib/bills";
import { CategoryIcon } from "@/components/CategoryIcon";
import { callGemini } from "@/lib/gemini";
import { toggleRecurring } from "./actions";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

async function cleanLabels(
  subs: { id: string; label: string; categoryName: string | null }[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (subs.length === 0) return map;

  const list = subs.map((s, i) => `${i + 1}. "${s.label}" (category: ${s.categoryName ?? "unknown"})`).join("\n");
  const prompt = `Clean up these transaction note labels into short, readable subscription/bill names (e.g. "SPOTIFY.COM" → "Spotify", "7-11 BKK #234" → "7-Eleven"). If the name is already clean, keep it. Reply with ONLY valid JSON: {"names": ["Name1", "Name2", ...]} — one name per input in the same order. No markdown.\n\n${list}`;

  try {
    const raw = await callGemini(prompt, { temperature: 0.1, maxTokens: 200 });
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { names: string[] };
    parsed.names.forEach((name, i) => {
      const sub = subs[i];
      if (sub && name?.trim()) map.set(sub.id, name.trim());
    });
  } catch { /* use original labels on failure */ }

  return map;
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Fetch 6 months of transactions (recurring-flagged + all expenses for pattern detection)
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: txns } = await supabase
    .from("transactions")
    .select("id, amount, note, category_id, occurred_at, is_recurring, categories(name, icon)")
    .eq("user_id", userData.user.id)
    .lt("amount", 0)
    .gte("occurred_at", sinceStr)
    .order("occurred_at", { ascending: false });

  const all = (txns ?? []).map((t) => ({
    ...t,
    categories: t.categories && !Array.isArray(t.categories) ? t.categories : null,
  }));

  const subs = getSubscriptions(all);

  // Clean up labels with Gemini (only those that look messy)
  const needsCleaning = subs.filter(
    (s) => /[#0-9]{3,}|[A-Z]{3,}\.|\.COM/i.test(s.label) || s.label.length > 20,
  );
  const labelMap = needsCleaning.length > 0
    ? await cleanLabels(needsCleaning.map((s) => ({ id: s.id, label: s.label, categoryName: s.categoryName })))
    : new Map<string, string>();

  const totalMonthly = subs.reduce((s, sub) => s + sub.amount, 0);
  const upcomingThisWeek = subs.filter((s) => s.daysUntil >= 0 && s.daysUntil <= 7);

  // Get category icons for display
  const catIconMap = new Map<string, string | null>();
  for (const t of all) {
    if (t.category_id && t.categories) catIconMap.set(t.category_id, t.categories.icon ?? null);
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <a href="/" className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">←</a>
        <h1 className="font-display text-lg">Subscriptions</h1>
      </header>

      {subs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/20">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
          <p className="font-body text-sm text-ink/40">No recurring charges detected yet.</p>
          <p className="font-body text-xs text-ink/30 max-w-xs">
            Mark transactions as "Recurring" when logging, or the same expense appearing across 2+ months will be detected automatically.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 px-6 pb-16">

          {/* Summary card */}
          <div className="rounded-2xl border border-mist bg-surface px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-body text-xs text-ink/40">Total per month</p>
              <p className="font-display text-3xl tabular-nums mt-0.5">{formatThb(totalMonthly)}</p>
              <p className="font-body text-xs text-ink/40 mt-1">{formatThb(totalMonthly * 12)} / year</p>
            </div>
            <div className="text-right">
              <p className="font-body text-xs text-ink/40">{subs.length} subscription{subs.length !== 1 ? "s" : ""}</p>
              {upcomingThisWeek.length > 0 && (
                <p className="font-body text-xs text-ink/60 mt-0.5">
                  {upcomingThisWeek.length} due this week
                </p>
              )}
            </div>
          </div>

          {/* Due this week */}
          {upcomingThisWeek.length > 0 && (
            <section className="flex flex-col gap-3">
              <p className="font-body text-xs uppercase tracking-widest text-ink/40">Due this week</p>
              <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">
                {upcomingThisWeek.map((sub) => {
                  const displayName = labelMap.get(sub.id) ?? sub.label;
                  return (
                    <a
                      key={sub.id}
                      href={`/transactions/new?from=${sub.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-mist/30 transition-colors"
                    >
                      <div>
                        <p className="font-body text-sm">{displayName}</p>
                        <p className="font-body text-xs text-ink/40 mt-0.5">
                          {sub.daysUntil === 0 ? "Due today" : sub.daysUntil === 1 ? "Due tomorrow" : `In ${sub.daysUntil} days · ${dateFmt.format(sub.nextDueDate)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-body text-sm tabular-nums">{formatThb(sub.amount)}</p>
                        <p className="font-body text-xs text-ink/30 mt-0.5">Log →</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* All subscriptions */}
          <section className="flex flex-col gap-3">
            <p className="font-body text-xs uppercase tracking-widest text-ink/40">All recurring</p>
            <div className="flex flex-col gap-3">
              {subs.map((sub) => {
                const displayName = labelMap.get(sub.id) ?? sub.label;
                return (
                  <div key={sub.id} className="rounded-2xl border border-mist bg-surface px-4 py-3.5 flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-ink/40">
                      <CategoryIcon icon={catIconMap.get(sub.id) ?? null} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm">{displayName}</p>
                      <p className="font-body text-xs text-ink/40 mt-0.5">
                        {sub.monthsActive} month{sub.monthsActive !== 1 ? "s" : ""} active
                        {sub.categoryName && sub.categoryName !== displayName ? ` · ${sub.categoryName}` : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="font-body text-xs text-ink/50">
                          Next: {dateFmt.format(sub.nextDueDate)}
                          {sub.daysUntil >= 0 && sub.daysUntil <= 14
                            ? ` (${sub.daysUntil === 0 ? "today" : sub.daysUntil === 1 ? "tomorrow" : `${sub.daysUntil}d`})`
                            : ""}
                        </p>
                        <a
                          href={`/transactions/new?from=${sub.id}`}
                          className="font-body text-xs text-sage underline underline-offset-2"
                        >
                          Log now
                        </a>
                        <form action={toggleRecurring} className="ml-auto">
                          <input type="hidden" name="id" value={sub.id} />
                          <input type="hidden" name="is_recurring" value={sub.isFlagged ? "0" : "1"} />
                          <button
                            type="submit"
                            className="font-body text-xs text-ink/30 hover:text-ink/60 transition-colors"
                          >
                            {sub.isFlagged ? "Unflag" : "Flag recurring"}
                          </button>
                        </form>
                      </div>
                    </div>
                    <p className="font-body text-sm tabular-nums text-right shrink-0">
                      {formatThb(sub.amount)}<span className="text-ink/30">/mo</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <p className="font-body text-xs text-ink/30 text-center">
            Auto-detected from transactions in the last 6 months.
            Tap "Log now" to pre-fill a new transaction.
          </p>
        </div>
      )}
    </main>
  );
}
