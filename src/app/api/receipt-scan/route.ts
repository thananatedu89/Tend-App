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

  // Keywords ranked by specificity
  const netKeywords    = /สุทธิ|ยอดรับสุทธิ|ยอดสุทธิ|รับสุทธิ|net\s*pay|take.?home/i;
  const totalKeywords  = /total|grand|รวมทั้งสิ้น|รวมเงิน|ยอดรวม|ยอดชำระ|ชำระเงิน|รวม|sum/i;
  // Lines that are definitely NOT merchant names
  const headerNoise = /receipt|invoice|tax|vat|เลขที่|วันที่|หมายเลข|เวลา|time|date|cashier|ref|order|slip|#\d|no\.|copy|original|ต้นฉบับ|สาขา|branch|pay\s*slip|ใบรับ|ใบเสร็จ/i;
  // Patterns that look like codes/IDs/stamps, not names
  const looksLikeCode = (s: string) =>
    /^\d+$/.test(s) ||
    /^[A-Z0-9\-\/]{1,6}$/.test(s) ||           // short all-caps code or stamp (DEMO, COPY, VOID)
    /^[A-Z]{4,}$/.test(s) ||                    // all-caps word (stamp)
    /^\+?0[689]\d{7,8}$/.test(s.replace(/[\s\-]/g, "")) ||
    /^\d{13}$/.test(s.replace(/[\s\-]/g, ""));

  // --- Amount ---
  let amount: string | null = null;

  // Pass 1: keyword on same line — bottom-up (works when OCR reads Thai correctly)
  for (let i = lines.length - 1; i >= 0; i--) {
    if (netKeywords.test(lines[i]!) || totalKeywords.test(lines[i]!)) {
      const nums = extractAmounts(lines[i]!);
      if (nums.length) { amount = String(nums[nums.length - 1]); break; }
      // keyword alone on its line — amount is on next line
      if (i + 1 < lines.length) {
        const nums2 = extractAmounts(lines[i + 1]!);
        if (nums2.length) { amount = String(nums2[nums2.length - 1]); break; }
      }
    }
  }

  // Pass 2 (robust fallback): last decimal amount in the document.
  // Thai OCR often garbles keywords (สุทธิ → "salaam"), but the NET/TOTAL
  // is always the last meaningful number before bank accounts / signatures.
  if (!amount) {
    // Collect all (index, value) pairs for amounts that look like currency
    // (must have a decimal point — avoids matching whole-number codes/IDs)
    const decimalAmounts: number[] = [];
    for (const line of lines) {
      const cleaned = line.replace(/[฿$€£,]/g, "");
      const matches = cleaned.match(/\b\d{1,6}\.\d{2}\b/g) ?? [];
      for (const m of matches) {
        const n = Number(m);
        if (n >= 1 && n < 500_000) decimalAmounts.push(n);
      }
    }
    if (decimalAmounts.length) {
      // Take the last decimal amount — on receipts & pay slips this is always the total/net
      amount = String(decimalAmounts[decimalAmounts.length - 1]);
    }
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

  // --- Merchant name: look in first 8 lines for meaningful text ---
  let note: string | null = null;
  const topLines = lines.slice(0, Math.min(10, lines.length));
  for (const line of topLines) {
    if (
      line.length >= 5 &&
      line.length <= 60 &&
      !looksLikeCode(line) &&
      !headerNoise.test(line) &&
      !netKeywords.test(line) &&
      !totalKeywords.test(line) &&
      !/^[\d\+\-\*\/฿=\.\,\s\:]+$/.test(line) &&   // not a pure number/math/time line
      !/^\d[\-:]\d/.test(line) &&                   // not a time/code like "0-0:0" or "1:30"
      !/^[=\-\<\>]{2,}/.test(line)                  // not a separator line like "====" or "->>"
    ) {
      // Prefer lines that contain Thai characters (company names in Thailand are in Thai)
      note = line;
      if (/[฀-๿]/.test(line)) break; // stop at first Thai line
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
