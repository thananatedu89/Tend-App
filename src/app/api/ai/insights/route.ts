import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: txns } = await supabase
    .from("transactions")
    .select("amount, occurred_at, categories(name)")
    .gte("occurred_at", sinceStr)
    .order("occurred_at", { ascending: false });

  const all = txns ?? [];

  // Aggregate by month
  const monthMap: Record<string, { spent: number; income: number }> = {};
  const catMap: Record<string, number> = {};
  const dowSpend = [0, 0, 0, 0, 0, 0, 0];
  const weekMap: Record<string, number> = {};

  for (const t of all) {
    const monthKey = t.occurred_at.slice(0, 7);
    if (!monthMap[monthKey]) monthMap[monthKey] = { spent: 0, income: 0 };
    const weekKey = getWeekKey(t.occurred_at);
    if (!weekMap[weekKey]) weekMap[weekKey] = 0;

    if (t.amount < 0) {
      monthMap[monthKey]!.spent += Math.abs(t.amount);
      weekMap[weekKey]! += Math.abs(t.amount);
      const catName =
        t.categories && !Array.isArray(t.categories)
          ? (t.categories.name ?? "Uncategorized")
          : "Uncategorized";
      catMap[catName] = (catMap[catName] ?? 0) + Math.abs(t.amount);
      const dow = (new Date(t.occurred_at + "T12:00:00").getDay() + 6) % 7;
      dowSpend[dow] += Math.abs(t.amount);
    } else {
      monthMap[monthKey]!.income += t.amount;
    }
  }

  const months = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-3)
    .map(([key, v]) => ({
      label: new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(key + "-15")),
      ...v,
    }));

  const topCats = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, total]) => ({ name, total }));

  const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const peakDowIdx = dowSpend.indexOf(Math.max(...dowSpend));
  const peakDow = DOW[peakDowIdx]!;

  const totalSpent = months.reduce((s, m) => s + m.spent, 0);
  const totalIncome = months.reduce((s, m) => s + m.income, 0);

  const current = months[months.length - 1];
  const prev = months[months.length - 2];

  const weekValues = Object.values(weekMap).filter(v => v > 0);
  const avgWeekly = weekValues.length ? weekValues.reduce((a, b) => a + b, 0) / weekValues.length : 0;
  const maxWeek = Math.max(...weekValues, 0);
  const spikePct = avgWeekly > 0 ? Math.round((maxWeek / avgWeekly - 1) * 100) : 0;

  const lines: string[] = [];

  // Opening summary
  if (months.length === 0 || totalSpent === 0) {
    return NextResponse.json({ summary: "No spending recorded in the last 90 days yet." });
  }

  if (current && prev && prev.spent > 0) {
    const delta = current.spent - prev.spent;
    const pct = Math.abs(Math.round((delta / prev.spent) * 100));
    if (delta > 0) {
      lines.push(`Your spending in ${current.label} was ฿${fmt(current.spent)}, up ${pct}% from ${prev.label}.`);
    } else if (delta < 0) {
      lines.push(`Your spending in ${current.label} was ฿${fmt(current.spent)}, down ${pct}% from ${prev.label} — a good trend.`);
    } else {
      lines.push(`Your spending in ${current.label} was ฿${fmt(current.spent)}, about the same as ${prev.label}.`);
    }
  } else if (current) {
    lines.push(`You spent ฿${fmt(current.spent)} this month across ${Object.keys(catMap).length} categories.`);
  }

  if (totalIncome > 0) {
    const savingsRate = Math.round(((totalIncome - totalSpent) / totalIncome) * 100);
    if (savingsRate > 0) {
      lines.push(`Over the past 3 months you kept ${savingsRate}% of your income — ฿${fmt(totalIncome - totalSpent)} saved.`);
    } else {
      lines.push(`Over 3 months your spending exceeded income by ฿${fmt(Math.abs(totalIncome - totalSpent))}.`);
    }
  }

  lines.push("");

  // Bullet observations
  if (topCats[0]) {
    const topShare = totalSpent > 0 ? Math.round((topCats[0].total / totalSpent) * 100) : 0;
    lines.push(`• ${topCats[0].name} is your biggest expense at ฿${fmt(topCats[0].total)} (${topShare}% of total spending).`);
  }

  if (spikePct > 40 && weekValues.length >= 3) {
    lines.push(`• Your busiest week was ฿${fmt(maxWeek)}, which is ${spikePct}% above your weekly average — most spending happens on ${peakDow}s.`);
  } else {
    lines.push(`• You tend to spend most on ${peakDow}s. Reviewing those transactions could reveal easy savings.`);
  }

  return NextResponse.json({ summary: lines.join("\n") });
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}
