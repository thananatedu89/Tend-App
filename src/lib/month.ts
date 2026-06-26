export function startOfMonth(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function monthProgress(date = new Date()) {
  const daysInMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  return date.getDate() / daysInMonth;
}

export function parseMonthParam(param: string | undefined): Date {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    if (y && m >= 1 && m <= 12) return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function prevMonthParam(date: Date): string {
  return startOfMonth(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

export function nextMonthParam(date: Date): string {
  return startOfMonth(new Date(date.getFullYear(), date.getMonth() + 1, 1));
}

export function isCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
