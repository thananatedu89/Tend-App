import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
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

  const monthMap: Record<string, { spent: number; income: number }> = {};
  const catMap: Record<string, number> = {};
  const dowSpend = [0, 0, 0, 0, 0, 0, 0];

  for (const t of txns ?? []) {
    const monthKey = t.occurred_at.slice(0, 7);
    if (!monthMap[monthKey]) monthMap[monthKey] = { spent: 0, income: 0 };
    if (t.amount < 0) {
      monthMap[monthKey]!.spent += Math.abs(t.amount);
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

  const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const peakDow = DOW[dowSpend.indexOf(Math.max(...dowSpend))] ?? "weekdays";

  const months = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-3)
    .map(([key, v]) => ({
      label: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
        new Date(key + "-15"),
      ),
      ...v,
    }));

  const topCategories = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, total]) => ({ name, total }));

  if (months.length === 0) {
    return NextResponse.json({ summary: "No transactions in the last 90 days yet." });
  }

  const dataBlock = `Monthly spending (last 3 months):
${months.map((m) => `- ${m.label}: spent ฿${m.spent.toLocaleString()}, income ฿${m.income.toLocaleString()}`).join("\n")}

Top categories (90 days):
${topCategories.map((c) => `- ${c.name}: ฿${c.total.toLocaleString()}`).join("\n")}

Peak spending day: ${peakDow}s`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `You are a calm, warm financial coach. Give brief, specific, non-judgmental insights. Use ฿ for Thai baht. Be direct. No disclaimers.

Here is the user's spending data:

${dataBlock}

Give:
1. A 2-sentence summary of their financial picture this quarter.
2. Two specific observations or suggestions based on the data.

Format: short paragraph, then exactly 2 bullet points starting with •`,
  });

  const summary = result.text ?? "";
  return NextResponse.json({ summary });
}
