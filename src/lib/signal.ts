import { formatThb } from "./format";

export function paceSignal(
  spent: number,
  totalBudget: number,
  monthProgress: number,
) {
  const left = totalBudget - spent;

  if (left <= 0) {
    return "You've used this month's budget. Anything more comes out of next month's calm.";
  }

  const expectedByNow = totalBudget * monthProgress;
  if (spent > expectedByNow * 1.15) {
    return `Spending a little faster than usual this month — ${formatThb(left)} left.`;
  }

  return `On track for the month — ${formatThb(left)} left.`;
}

export function healthScore({
  budget,
  spentThisMonth,
  daysElapsed,
  daysInMonth,
  goalCount,
  goalsWithSavings,
  streak,
}: {
  budget: number | null;
  spentThisMonth: number;
  daysElapsed: number;
  daysInMonth: number;
  goalCount: number;
  goalsWithSavings: number;
  streak: number;
}): { score: number; label: string; breakdown: { budget: number; pace: number; goals: number; streak: number } } {
  // Budget adherence (0–40 pts)
  let budgetPts = 20; // neutral when no budget
  if (budget && budget > 0) {
    const ratio = spentThisMonth / budget;
    if (ratio <= 1) budgetPts = 40;
    else if (ratio <= 1.5) budgetPts = Math.round(40 * (1.5 - ratio) / 0.5);
    else budgetPts = 0;
  }

  // Pace (0–20 pts) — only when budget set and enough days elapsed
  let pacePts = 10; // neutral
  if (budget && budget > 0 && daysElapsed >= 3) {
    const expected = budget * (daysElapsed / daysInMonth);
    const ratio = spentThisMonth / Math.max(expected, 1);
    if (ratio <= 1) pacePts = 20;
    else if (ratio <= 1.5) pacePts = Math.round(20 * (1.5 - ratio) / 0.5);
    else pacePts = 0;
  }

  // Goals (0–30 pts)
  let goalPts = 10; // neutral when no goals
  if (goalCount > 0 && goalsWithSavings === 0) goalPts = 15;
  else if (goalCount > 0 && goalsWithSavings === 1) goalPts = 22;
  else if (goalCount > 0 && goalsWithSavings >= 2) goalPts = 30;

  // Streak (0–10 pts)
  const streakPts = streak >= 7 ? 10 : streak >= 3 ? 6 : streak >= 1 ? 2 : 0;

  const score = Math.min(100, budgetPts + pacePts + goalPts + streakPts);
  const label =
    score >= 80 ? "Excellent" :
    score >= 65 ? "Good" :
    score >= 45 ? "Fair" :
    "Needs attention";

  return { score, label, breakdown: { budget: budgetPts, pace: pacePts, goals: goalPts, streak: streakPts } };
}

export function forecastLine(
  spent: number,
  daysElapsed: number,
  daysInMonth: number,
  budget: number | null,
): string | null {
  if (daysElapsed < 3 || spent === 0) return null;
  const projected = Math.round((spent / daysElapsed) * daysInMonth);
  if (budget) {
    const diff = projected - budget;
    if (diff > 200) return `Projected to overspend by ${formatThb(diff)} this month.`;
    if (diff < -200) return `Projected to finish ${formatThb(Math.abs(diff))} under budget.`;
    return `Projected to finish right on budget.`;
  }
  return `Projected ${formatThb(projected)} total this month.`;
}
