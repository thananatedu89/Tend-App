export type UpcomingBill = {
  id: string;
  label: string;
  amount: number;
  dueDay: number;
  daysUntil: number;
  dueDate: Date;
};

type RecurringTxn = {
  id: string;
  amount: number;
  note: string | null;
  category_id: string | null;
  occurred_at: string;
  categories: { name: string } | null;
};

export function getUpcomingBills(
  txns: RecurringTxn[],
  withinDays = 7,
): UpcomingBill[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group by fingerprint, keep most recent per group
  const bills = new Map<string, RecurringTxn>();
  for (const t of txns) {
    const key = `${t.category_id ?? ""}|${t.note ?? ""}|${Math.round(Math.abs(t.amount) / 50) * 50}`;
    if (!bills.has(key)) bills.set(key, t);
  }

  const upcoming: UpcomingBill[] = [];

  for (const bill of bills.values()) {
    const lastDate = new Date(bill.occurred_at);
    const dueDay = lastDate.getDate();

    // Find next occurrence: same day in current or next month
    let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (dueDate <= today) {
      dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    }

    const daysUntil = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

    if (daysUntil >= 0 && daysUntil <= withinDays) {
      const label = bill.note ?? (bill.categories as { name: string } | null)?.name ?? "Bill";
      upcoming.push({ id: bill.id, label, amount: Math.abs(bill.amount), dueDay, daysUntil, dueDate });
    }
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}
