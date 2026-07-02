export function PlusGate({
  backHref,
  title,
  description,
}: {
  backHref: string;
  title: string;
  description: string;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <a href={backHref} className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors">
          ←
        </a>
        <h1 className="font-display text-lg">{title}</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center gap-8">
        <div className="flex flex-col gap-3 max-w-xs">
          <p className="font-body text-xs uppercase tracking-widest text-ink/40">Tend Plus</p>
          <p className="font-display text-2xl">{title}</p>
          <p className="font-body text-sm text-ink/60">{description}</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href="/upgrade"
            className="font-body w-full rounded-full bg-ink px-4 py-3 text-paper text-sm text-center transition-opacity hover:opacity-90"
          >
            Upgrade to Tend Plus
          </a>
          <a
            href={backHref}
            className="font-body text-center text-sm text-ink/40 hover:text-ink/60 transition-colors"
          >
            Not now
          </a>
        </div>
      </div>
    </main>
  );
}
