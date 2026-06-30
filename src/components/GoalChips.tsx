"use client";

const CHIPS = [500, 1000, 2000, 5000];

export function GoalChips({ targetId }: { targetId: string }) {
  function fill(amount: number) {
    const input = document.getElementById(targetId) as HTMLInputElement | null;
    if (input) {
      input.value = String(amount);
      input.focus();
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {CHIPS.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => fill(v)}
          className="font-body text-xs rounded-full border border-mist px-3 py-1.5 text-ink/60 hover:border-sage hover:text-sage transition-colors"
        >
          ฿{v.toLocaleString()}
        </button>
      ))}
    </div>
  );
}
