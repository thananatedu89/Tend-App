import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

  // Forward to OCR.space (free tier, no signup required with helloworld key)
  const ocrForm = new FormData();
  ocrForm.append("file", file);
  ocrForm.append("language", "eng");
  ocrForm.append("isOverlayRequired", "false");
  ocrForm.append("detectOrientation", "true");
  ocrForm.append("scale", "true");
  ocrForm.append("OCREngine", "2"); // engine 2 is better for printed text

  const apiKey = process.env.OCR_SPACE_KEY ?? "helloworld";
  const ocrRes = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: apiKey },
    body: ocrForm,
  });

  if (!ocrRes.ok) {
    return NextResponse.json({ error: "OCR service error" }, { status: 502 });
  }

  const ocrJson = await ocrRes.json();
  const rawText: string = ocrJson?.ParsedResults?.[0]?.ParsedText ?? "";

  if (!rawText.trim()) {
    return NextResponse.json({ amount: null, date: null, note: null, raw: "" });
  }

  const parsed = parseReceipt(rawText);
  return NextResponse.json({ ...parsed, raw: rawText });
}

function parseReceipt(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const totalKeywords = /total|grand|net|รวม|ยอด|ชำระ|สุทธิ|sum|subtotal/i;
  // Lines that are definitely NOT merchant names
  const headerNoise = /receipt|invoice|tax|vat|เลขที่|วันที่|หมายเลข|เวลา|time|date|cashier|ref|order|slip|#\d|no\.|copy|original|ต้นฉบับ|สาขา|branch/i;
  // Patterns that look like codes/IDs, not names
  const looksLikeCode = (s: string) =>
    /^\d+$/.test(s) ||                          // all digits
    /^[A-Z0-9\-\/]{6,}$/.test(s) ||            // all-caps code e.g. "INV-00123"
    /^\+?0[689]\d{7,8}$/.test(s.replace(/[\s\-]/g, "")) || // Thai phone number
    /^\d{13}$/.test(s.replace(/[\s\-]/g, ""));  // Tax ID

  // --- Amount ---
  let amount: string | null = null;

  // Pass 1: keyword on same line as number — scan from bottom (totals are at the end)
  for (let i = lines.length - 1; i >= 0; i--) {
    if (totalKeywords.test(lines[i]!)) {
      const nums = extractAmounts(lines[i]!);
      if (nums.length) { amount = String(nums[nums.length - 1]); break; }
    }
  }

  // Pass 2: keyword line immediately followed by a number line (bottom-up)
  if (!amount) {
    for (let i = lines.length - 2; i >= 0; i--) {
      if (totalKeywords.test(lines[i]!)) {
        const nums = extractAmounts(lines[i + 1]!);
        if (nums.length) { amount = String(nums[nums.length - 1]); break; }
      }
    }
  }

  // Pass 3: largest amount in the bottom third of the receipt
  if (!amount) {
    const bottomLines = lines.slice(Math.floor(lines.length * 0.5));
    const nums = bottomLines.flatMap(extractAmounts);
    if (nums.length) amount = String(Math.max(...nums));
  }

  // Pass 4: largest amount anywhere, but exclude phone/ID-looking numbers
  if (!amount) {
    const nums = lines.flatMap(extractAmounts);
    if (nums.length) amount = String(Math.max(...nums));
  }

  // --- Date ---
  const datePatterns = [
    { re: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/, fn: (m: RegExpMatchArray) => toIso(m[3]!, m[2]!, m[1]!) },
    { re: /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/, fn: (m: RegExpMatchArray) => toIso(m[1]!, m[2]!, m[3]!) },
    { re: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{4})\b/i, fn: (m: RegExpMatchArray) => toIso(m[3]!, String(monthNum(m[2]!)), m[1]!) },
  ];

  let date: string | null = null;
  const fullText = lines.join(" ");
  for (const { re, fn } of datePatterns) {
    const m = fullText.match(re);
    if (m) { const iso = fn(m); if (iso) { date = iso; break; } }
  }

  // --- Merchant name: look in first 6 lines for meaningful text ---
  let note: string | null = null;
  const topLines = lines.slice(0, Math.min(8, lines.length));
  for (const line of topLines) {
    if (
      line.length >= 3 &&
      line.length <= 60 &&
      !looksLikeCode(line) &&
      !headerNoise.test(line) &&
      !totalKeywords.test(line) &&
      !/^[\d\+\-\*\/฿=]+$/.test(line)  // not a math/price line
    ) {
      note = line;
      break;
    }
  }

  return { amount, date, note };
}

function extractAmounts(line: string): number[] {
  // Remove currency symbols and thousands commas, then find decimal numbers
  const cleaned = line.replace(/[฿$€£,]/g, "");
  const matches = cleaned.match(/\b\d{1,6}(\.\d{1,2})?\b/g) ?? [];
  return matches
    .map(Number)
    .filter((n) => n >= 1 && n < 500_000 && !/^0\d{6,}/.test(String(n))); // exclude phone-like
}

function toIso(y: string, m: string, d: string): string | null {
  const year = parseInt(y);
  // Thai Buddhist era (BE) — subtract 543
  const realYear = year > 2500 ? year - 543 : year;
  const month = parseInt(m);
  const day = parseInt(d);
  if (realYear < 2000 || realYear > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${realYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthNum(abbr: string): number {
  return ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(abbr.toLowerCase()) + 1;
}
