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

  // --- Amount: find the largest number near total keywords ---
  const totalKeywords = /total|grand|net|amount|รวม|ยอด|ชำระ|sum/i;
  let amount: string | null = null;

  // First pass: look for a total keyword on the same line as a number
  for (const line of lines) {
    if (totalKeywords.test(line)) {
      const nums = extractNumbers(line);
      if (nums.length) {
        amount = String(Math.max(...nums));
        break;
      }
    }
  }

  // Second pass: look for keyword line followed immediately by a number line
  if (!amount) {
    for (let i = 0; i < lines.length - 1; i++) {
      if (totalKeywords.test(lines[i]!)) {
        const nums = extractNumbers(lines[i + 1]!);
        if (nums.length) {
          amount = String(Math.max(...nums));
          break;
        }
      }
    }
  }

  // Third pass: just pick the largest number on the receipt (likely the total)
  if (!amount) {
    const allNums = lines.flatMap(extractNumbers);
    if (allNums.length) {
      amount = String(Math.max(...allNums));
    }
  }

  // --- Date: look for common date patterns ---
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    { re: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/, parse: (m: RegExpMatchArray) => toIso(m[3]!, m[2]!, m[1]!) },
    // YYYY/MM/DD or YYYY-MM-DD
    { re: /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/, parse: (m: RegExpMatchArray) => toIso(m[1]!, m[2]!, m[3]!) },
    // DD Mon YYYY  (e.g. 01 Jul 2026)
    { re: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i, parse: (m: RegExpMatchArray) => toIso(m[3]!, String(monthNum(m[2]!)), m[1]!) },
  ];

  let date: string | null = null;
  const fullText = lines.join(" ");
  for (const { re, parse } of datePatterns) {
    const m = fullText.match(re);
    if (m) {
      const iso = parse(m);
      if (iso) { date = iso; break; }
    }
  }

  // --- Note / merchant: first line that looks like a name ---
  let note: string | null = null;
  for (const line of lines) {
    if (
      line.length >= 3 &&
      !/^\d/.test(line) &&          // doesn't start with a digit
      !/^[\+\-\*\/]/.test(line) &&  // not an operator line
      !totalKeywords.test(line) &&
      !/receipt|invoice|tax|vat|เลขที่|วันที่|หมายเลข/i.test(line)
    ) {
      note = line.slice(0, 60);
      break;
    }
  }

  return { amount, date, note };
}

function extractNumbers(line: string): number[] {
  const cleaned = line.replace(/[฿,]/g, "");
  const matches = cleaned.match(/\d+(\.\d{1,2})?/g) ?? [];
  return matches.map(Number).filter((n) => n > 0 && n < 1_000_000);
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
