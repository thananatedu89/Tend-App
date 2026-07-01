export type UpcomingBill = {
  id: string;
  label: string;
  amount: number;
  dueDay: number;
  daysUntil: number;
  dueDate: Date;
};

export type Subscription = {
  id: string;
  label: string;
  amount: number;
  monthsActive: number;
  lastDate: string;
  nextDueDate: Date;
  daysUntil: number;
  dueDay: number;
  isFlagged: boolean;
  categoryName: string | null;
};

type RecurringTxn = {
  id: string;
  amount: number;
  note: string | null;
  category_id: string | null;
  occurred_at: string;
  categories: { name: string } | null;
  is_recurring?: boolean;
};

/** Next due date logic: same day-of-month, current or next month */
function nextDue(lastDateStr: string): { dueDate: Date; dueDay: number; daysUntil: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDate = new Date(lastDateStr + "T12:00:00");
  const dueDay = lastDate.getDate();

  let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (dueDate <= today) {
    dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  }

  const daysUntil = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  return { dueDate, dueDay, daysUntil };
}

/** Upcoming bills from recurring-flagged transactions due within `withinDays` */
export function getUpcomingBills(
  txns: RecurringTxn[],
  withinDays = 7,
): UpcomingBill[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bills = new Map<string, RecurringTxn>();
  for (const t of txns) {
    const key = `${t.category_id ?? ""}|${t.note ?? ""}|${Math.round(Math.abs(t.amount) / 50) * 50}`;
    if (!bills.has(key)) bills.set(key, t);
  }

  const upcoming: UpcomingBill[] = [];
  for (const bill of bills.values()) {
    const { dueDate, dueDay, daysUntil } = nextDue(bill.occurred_at);
    if (daysUntil >= 0 && daysUntil <= withinDays) {
      const label = bill.note ?? (bill.categories as { name: string } | null)?.name ?? "Bill";
      upcoming.push({ id: bill.id, label, amount: Math.abs(bill.amount), dueDay, daysUntil, dueDate });
    }
  }
  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Detect subscriptions from the last 6 months of transactions.
 * Includes both `is_recurring=true` entries and pattern-detected ones
 * (same note+category+amount appearing in 2+ distinct calendar months).
 */
export function getSubscriptions(txns: RecurringTxn[]): Subscription[] {
  // Group by fingerprint: category | note | rounded amount
  const groups = new Map<
    string,
    {
      txns: RecurringTxn[];
      months: Set<string>;
      isFlagged: boolean;
    }
  >();

  for (const t of txns) {
    const roundedAmount = Math.round(Math.abs(t.amount) / 10) * 10;
    const key = `${t.category_id ?? ""}|${(t.note ?? "").trim().toLowerCase()}|${roundedAmount}`;
    if (!groups.has(key)) groups.set(key, { txns: [], months: new Set(), isFlagged: false });
    const g = groups.get(key)!;
    g.txns.push(t);
    g.months.add(t.occurred_at.slice(0, 7));
    if (t.is_recurring) g.isFlagged = true;
  }

  const subscriptions: Subscription[] = [];

  for (const g of groups.values()) {
    // Include if flagged OR appeared in 2+ distinct months
    if (!g.isFlagged && g.months.size < 2) continue;

    // Pick the most recent transaction as the representative
    const sorted = g.txns.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
    const latest = sorted[0]!;
    const label = latest.note?.trim() || (latest.categories as { name: string } | null)?.name || "Subscription";
    const catName = (latest.categories as { name: string } | null)?.name ?? null;
    const { dueDate, dueDay, daysUntil } = nextDue(latest.occurred_at);

    subscriptions.push({
      id: latest.id,
      label,
      amount: Math.abs(latest.amount),
      monthsActive: g.months.size,
      lastDate: latest.occurred_at,
      nextDueDate: dueDate,
      daysUntil,
      dueDay,
      isFlagged: g.isFlagged,
      categoryName: catName,
    });
  }

  return subscriptions.sort((a, b) => a.daysUntil - b.daysUntil);
}
