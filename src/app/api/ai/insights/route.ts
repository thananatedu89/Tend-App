import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini } from "@/lib/gemini";

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

  if (all.length === 0) {
    return NextResponse.json({ summary: "No spending recorded in the last 90 days yet." });
  }

  // Aggregate stats to feed into Gemini
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
    .slice(-3);

  const topCats = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, total]) => ({ name, total }));

  const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const peakDowIdx = dowSpend.indexOf(Math.max(...dowSpend));
  const peakDow = DOW[peakDowIdx];

  const weekValues = Object.values(weekMap).filter(v => v > 0);
  const avgWeekly = weekValues.length ? weekValues.reduce((a, b) => a + b, 0) / weekValues.length : 0;
  const maxWeek = Math.max(...weekValues, 0);

  const totalSpent = months.reduce((s, [, v]) => s + v.spent, 0);
  const totalIncome = months.reduce((s, [, v]) => s + v.income, 0);

  const monthSummaries = months.map(([key, v]) => {
    const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(key + "-15"));
    return `${label}: spent ฿${fmt(v.spent)}, income ฿${fmt(v.income)}`;
  });

  const prompt = `You are a personal finance coach. Analyze this user's spending data for the past 90 days and provide a concise, friendly, actionable summary in 3–4 short paragraphs. Use ฿ for Thai Baht. Be specific with numbers. Highlight one positive and one area to improve. Do not use bullet points — write in flowing prose.

Monthly breakdown:
${monthSummaries.join("\n")}

Top spending categories:
${topCats.map(c => `• ${c.name}: ฿${fmt(c.total)}`).join("\n")}

Total 3-month spending: ฿${fmt(totalSpent)}
${totalIncome > 0 ? `Total 3-month income: ฿${fmt(totalIncome)} (savings rate: ${Math.round(((totalIncome - totalSpent) / totalIncome) * 100)}%)` : ""}
Peak spending day of week: ${peakDow}
Busiest week: ฿${fmt(maxWeek)} (avg: ฿${fmt(Math.round(avgWeekly))}/week)

Write the summary now:`;

  try {
    const summary = await callGemini(prompt, { temperature: 0.5, maxTokens: 400 });
    return NextResponse.json({ summary });
  } catch {
    // Fallback to rule-based if Gemini fails
    const current = months[months.length - 1];
    const prev = months[months.length - 2];
    const lines: string[] = [];
    if (current && prev) {
      const [, cv] = current;
      const [, pv] = prev;
      const delta = cv.spent - pv.spent;
      const pct = pv.spent > 0 ? Math.abs(Math.round((delta / pv.spent) * 100)) : 0;
      lines.push(delta > 0
        ? `Spending was up ${pct}% last month to ฿${fmt(cv.spent)}.`
        : `Spending dropped ${pct}% to ฿${fmt(cv.spent)} — a good trend.`);
    }
    if (topCats[0]) lines.push(`Top category: ${topCats[0].name} at ฿${fmt(topCats[0].total)}.`);
    lines.push(`You tend to spend most on ${peakDow}s.`);
    return NextResponse.json({ summary: lines.join(" ") });
  }
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
