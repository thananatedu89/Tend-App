import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGeminiVision } from "@/lib/gemini";

const RECEIPT_PROMPT = `This is a Thai or English receipt, slip, or invoice.
Extract exactly three fields:
1. TOTAL amount paid — the final "สุทธิ / ยอดสุทธิ / total / grand total / net pay" in Thai Baht — a plain number like "123.50"
2. DATE of the transaction — as YYYY-MM-DD; if the year is in Buddhist Era (e.g. 2568) subtract 543 to get CE year
3. MERCHANT / SHOP NAME — prefer Thai text; keep it short and clean (no address, no tax ID)

Reply with ONLY this JSON — no markdown, no explanation:
{"amount":"123.50","date":"2025-10-15","note":"ร้านอาหาร XYZ"}

If a field cannot be determined, use null for that field.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";

  try {
    const raw = await callGeminiVision(base64, mimeType, RECEIPT_PROMPT, {
      temperature: 0.1,
      maxTokens: 128,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ amount: null, date: null, note: null, raw });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      amount?: string | null;
      date?: string | null;
      note?: string | null;
    };

    return NextResponse.json({
      amount: parsed.amount ?? null,
      date: parsed.date ?? null,
      note: parsed.note ?? null,
      raw,
    });
  } catch (e) {
    console.error("Gemini receipt scan error:", e);
    return NextResponse.json({ amount: null, date: null, note: null, raw: "" });
  }
}
