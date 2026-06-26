export function startOfWeek(date = new Date()): Date {
  const day = date.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
}

export function weekDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseWeekParam(param: string | undefined): Date {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const [y, mo, d] = param.split("-").map(Number);
    if (y && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
      return new Date(y, mo - 1, d);
  }
  return startOfWeek();
}

export function weekEndDate(weekStart: Date): Date {
  return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
}

export function prevWeekParam(weekStart: Date): string {
  return weekDateStr(
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7),
  );
}

export function nextWeekParam(weekStart: Date): string {
  return weekDateStr(
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7),
  );
}

export function isCurrentWeek(weekStart: Date): boolean {
  const current = startOfWeek();
  return weekStart.getTime() === current.getTime();
}
