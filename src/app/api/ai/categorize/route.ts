import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { note, categories } = await req.json() as {
    note: string;
    categories: { id: string; name: string }[];
  };

  if (!note?.trim() || !categories?.length) {
    return NextResponse.json({ category_id: null });
  }

  const list = categories.map((c, i) => `${i + 1}. ${c.name}`).join("\n");

  const prompt = `You are categorizing a personal finance transaction. Given the transaction description and a list of categories, reply with ONLY the number of the best matching category. If nothing fits well, reply with 0.

Transaction description: "${note.trim()}"

Categories:
${list}

Reply with a single number only:`;

  try {
    const raw = await callGemini(prompt, { temperature: 0.1, maxTokens: 4 });
    const idx = parseInt(raw.trim()) - 1;
    const matched = categories[idx];
    return NextResponse.json({ category_id: matched?.id ?? null });
  } catch {
    return NextResponse.json({ category_id: null });
  }
}
