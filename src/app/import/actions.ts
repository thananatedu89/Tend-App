"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export async function importTransactions(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) redirect("/import?error=Paste+some+CSV+data+first");

  const rawLines = csv
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim());

  if (rawLines.length === 0) redirect("/import?error=No+rows+found");

  const start = rawLines[0]?.toLowerCase().startsWith("date") ? 1 : 0;
  const dataLines = rawLines.slice(start);

  if (dataLines.length === 0)
    redirect("/import?error=No+data+rows+found+(only+a+header+row+was+detected)");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name");

  const categoryMap = new Map(
    (categories ?? []).map((c) => [c.name.toLowerCase(), c.id]),
  );

  const toInsert: {
    user_id: string;
    occurred_at: string;
    amount: number;
    category_id: string | null;
    note: string | null;
  }[] = [];

  let skipped = 0;

  for (const line of dataLines) {
    const [dateStr, typeStr, categoryStr, amountStr, noteStr] =
      parseCSVLine(line);

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      skipped++;
      continue;
    }

    const absAmount = parseFloat(amountStr ?? "");
    if (!Number.isFinite(absAmount) || absAmount <= 0) {
      skipped++;
      continue;
    }

    const isExpense = (typeStr ?? "").trim().toLowerCase() !== "income";
    const amount = isExpense ? -absAmount : absAmount;
    const categoryId =
      categoryMap.get((categoryStr ?? "").trim().toLowerCase()) ?? null;
    const note = (noteStr ?? "").trim() || null;

    toInsert.push({
      user_id: userData.user.id,
      occurred_at: dateStr.trim(),
      amount,
      category_id: categoryId,
      note,
    });
  }

  if (toInsert.length === 0) {
    redirect(
      `/import?error=${encodeURIComponent(
        "No valid rows to import. Check that dates are YYYY-MM-DD and amounts are positive numbers.",
      )}`,
    );
  }

  const { error } = await supabase.from("transactions").insert(toInsert);
  if (error) redirect(`/import?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/insights");
  redirect(
    `/transactions?imported=${toInsert.length}${skipped > 0 ? `&skipped=${skipped}` : ""}`,
  );
}
