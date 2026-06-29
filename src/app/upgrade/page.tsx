export default function UpgradePage() {
  const benefits = [
    { text: "Connect bank accounts for automatic sync" },
    { text: "Unlimited budgets and category tracking" },
    { text: "Shared budgets with a partner or household" },
    { text: "Calm spending insights and trend reports" },
    { text: "Export your data anytime, in any format" },
  ];

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-10 py-10">

        {/* Header */}
        <div className="flex flex-col gap-3 text-center">
          <h1 className="font-display text-3xl">
            More clarity,<br />when you want it.
          </h1>
          <p className="font-body text-sm text-ink/60">
            Tend Free covers the essentials. Plus adds the tools for a fuller picture.
          </p>
        </div>

        {/* Benefits */}
        <ul className="flex flex-col gap-3">
          {benefits.map((b) => (
            <li key={b.text} className="flex items-start gap-3">
              <span className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-sage-soft text-sage shrink-0">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              </span>
              <span className="font-body text-sm">{b.text}</span>
            </li>
          ))}
        </ul>

        {/* Pricing options */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col divide-y divide-mist rounded-2xl border border-mist bg-surface overflow-hidden">

            {/* Monthly */}
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="font-body text-sm">Tend Plus</p>
                <p className="font-body text-xs text-ink/50">Monthly</p>
              </div>
              <p className="font-display text-lg tabular-nums">฿99<span className="font-body text-xs text-ink/40">/mo</span></p>
            </div>

            {/* Annual */}
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="font-body text-sm">Tend Plus</p>
                <p className="font-body text-xs text-ink/50">Annual — save 25%</p>
              </div>
              <p className="font-display text-lg tabular-nums">฿890<span className="font-body text-xs text-ink/40">/yr</span></p>
            </div>

            {/* Forever */}
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="font-body text-sm">Tend Forever</p>
                <p className="font-body text-xs text-ink/50">One-time, yours permanently</p>
              </div>
              <p className="font-display text-lg tabular-nums">฿2,490</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 items-center">
          <button
            type="button"
            className="font-body w-full rounded-full bg-ink px-4 py-3 text-paper text-sm transition-opacity hover:opacity-90"
          >
            Get started with Plus
          </button>
          <a
            href="/settings"
            className="font-body text-sm text-ink/50 hover:text-ink/70 transition-colors"
          >
            Maybe later
          </a>
        </div>

        <p className="font-body text-xs text-ink/40 text-center">
          Purchases are processed securely. Cancel any time from your account settings.
        </p>

      </div>
    </main>
  );
}
