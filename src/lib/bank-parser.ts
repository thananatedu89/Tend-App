export interface ParsedRow {
  date: string;        // YYYY-MM-DD
  description: string;
  amount: number;      // negative = expense, positive = income
}

export interface ParseResult {
  bank: string;
  rows: ParsedRow[];
  skipped: number;
}

function parseCSVLine(line: string, sep = ","): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseDate(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, " ");
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  // YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[\/](\d{2})[\/](\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  // DD MMM YYYY  e.g. "15 Jan 2024"
  const dmyText = s.match(/^(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})$/);
  if (dmyText) {
    const mo = MONTHS[dmyText[2]!.toLowerCase()];
    if (mo) return `${dmyText[3]}-${mo}-${dmyText[1]!.padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  // strip currency symbols, spaces, thousands commas; convert (1,234.00) → -1234
  const s = raw.trim()
    .replace(/[฿$£€\s]/g, "")
    .replace(/^(\()([\d,\.]+)\)$/, "-$2")
    .replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function colIdx(headers: string[], ...keywords: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const i = lower.findIndex((h) => h.includes(kw));
    if (i >= 0) return i;
  }
  return -1;
}

export function parseBankCSV(csv: string): ParseResult {
  // Strip BOM, normalise line endings
  const text = csv.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { bank: "Unknown", rows: [], skipped: 0 };

  // Detect separator
  const sep = (lines[0] ?? "").includes("\t") ? "\t" : ",";

  // Find header row (first row with ≥ 3 columns)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    if (parseCSVLine(lines[i] ?? "", sep).length >= 3) { headerIdx = i; break; }
  }

  const headers = parseCSVLine(lines[headerIdx] ?? "", sep);
  const dataLines = lines.slice(headerIdx + 1);

  // Detect bank name from header content
  const headerStr = headers.join(" ").toLowerCase();
  let bank = "Bank statement";
  if (headerStr.includes("kasikorn") || headerStr.includes("kbank")) bank = "KBank";
  else if (headerStr.includes("scb") || headerStr.includes("siam commercial")) bank = "SCB";
  else if (headerStr.includes("bangkok bank") || headerStr.includes("bbl")) bank = "Bangkok Bank";
  else if (headerStr.includes("krungthai") || headerStr.includes("ktb")) bank = "KTB";
  else if (headerStr.includes("ttb") || headerStr.includes("tmb") || headerStr.includes("thanachart")) bank = "TTB";
  else if (headerStr.includes("bay") || headerStr.includes("krungsri")) bank = "Krungsri";
  else if (headerStr.includes("uob")) bank = "UOB";
  else if (headerStr.includes("citi")) bank = "Citibank";

  // Map columns
  const dateCol  = colIdx(headers, "date", "วันที่", "transaction date", "txn date", "posting date", "value date");
  const descCol  = colIdx(headers, "description", "remark", "รายการ", "detail", "particulars", "memo", "narrative", "details");
  const debitCol = colIdx(headers, "withdrawal", "debit", "ถอน", "withdrawals", "dr ", "debit amount", "debit(thb)", "withdrawal(thb)", "ถอน(บาท)");
  const creditCol = colIdx(headers, "deposit", "credit", "ฝาก", "deposits", "cr ", "credit amount", "credit(thb)", "deposit(thb)", "ฝาก(บาท)");
  // fallback: single amount column
  const amtCol = (debitCol < 0 && creditCol < 0)
    ? colIdx(headers, "amount", "จำนวน", "money", "value", "จำนวนเงิน")
    : -1;

  const rows: ParsedRow[] = [];
  let skipped = 0;

  for (const line of dataLines) {
    const f = parseCSVLine(line, sep);
    if (f.length < 2) { skipped++; continue; }

    // Date
    const rawDate = dateCol >= 0 ? (f[dateCol] ?? "") : (f[0] ?? "");
    const date = parseDate(rawDate);
    if (!date) { skipped++; continue; }

    // Description
    const description = (descCol >= 0 ? f[descCol] : f[1]) ?? "";

    // Amount
    let amount: number | null = null;
    if (debitCol >= 0 || creditCol >= 0) {
      const debit  = debitCol  >= 0 ? parseAmount(f[debitCol])  : null;
      const credit = creditCol >= 0 ? parseAmount(f[creditCol]) : null;
      if (debit  && debit  > 0) amount = -debit;
      else if (credit && credit > 0) amount = credit;
    } else if (amtCol >= 0) {
      amount = parseAmount(f[amtCol]);
    }

    if (!amount || amount === 0) { skipped++; continue; }

    rows.push({ date, description: description.trim(), amount });
  }

  return { bank, rows, skipped };
}
