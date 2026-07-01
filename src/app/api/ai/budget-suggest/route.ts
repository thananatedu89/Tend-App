import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categories, totalAvg } = await req.json() as {
    categories: { id: string; name: string; avg: number }[];
    totalAvg: number;
  };

  if (!categories?.length) {
    return NextResponse.json({ error: "No categories" }, { status: 400 });
  }

  const catList = categories
    .filter(c => c.avg > 0)
    .map(c => `• ${c.name}: 3-month avg ฿${Math.round(c.avg).toLocaleString()}/month`)
    .join("\n");

  const prompt = `You are a personal finance advisor. Based on the user's actual 3-month spending averages, suggest a realistic monthly budget for each category. Round to the nearest 100 ฿. Be slightly conservative — aim for 5–15% below actual spending where possible to encourage saving, but don't suggest unrealistically low amounts. Also suggest a total budget.

Spending averages:
${catList}
Total average monthly spending: ฿${Math.round(totalAvg).toLocaleString()}

Reply with ONLY valid JSON in this exact format (no markdown, no extra text):
{"total": NUMBER, "categories": [{"name": "CATEGORY_NAME", "amount": NUMBER, "tip": "ONE_SHORT_SENTENCE"}]}`;

  try {
    const raw = await callGemini(prompt, { temperature: 0.3, maxTokens: 600 });
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      total: number;
      categories: { name: string; amount: number; tip: string }[];
    };

    // Map names back to IDs
    const withIds = parsed.categories.map(s => {
      const cat = categories.find(c => c.name.toLowerCase() === s.name.toLowerCase());
      return { ...s, id: cat?.id ?? null };
    });

    return NextResponse.json({ total: parsed.total, categories: withIds });
  } catch {
    return NextResponse.json({ error: "Could not generate suggestions" }, { status: 500 });
  }
}
