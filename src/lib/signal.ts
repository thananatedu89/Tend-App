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
