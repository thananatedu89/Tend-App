"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseBankCSV } from "@/lib/bank-parser";
import { autoCategorize } from "@/lib/auto-categorize";

export async function importBankStatement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) redirect("/import/bank?error=Paste+your+bank+statement+CSV+first");

  const { rows, skipped } = parseBankCSV(csv);

  if (rows.length === 0) {
    redirect("/import/bank?error=" + encodeURIComponent(
      "No valid rows found. Make sure you're pasting a CSV export from your bank."
    ));
  }

  const { data: categories } = await supabase.from("categories").select("id, name");
  const categoryMap = new Map((categories ?? []).map((c) => [c.name.toLowerCase(), c.id]));

  const toInsert = rows.map((r) => ({
    user_id: user.id,
    occurred_at: r.date,
    amount: r.amount,
    note: r.description || null,
    category_id: autoCategorize(r.description, r.amount, categoryMap),
  }));

  const { error } = await supabase.from("transactions").insert(toInsert);
  if (error) redirect(`/import/bank?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/transactions");

  const categorized = toInsert.filter((r) => r.category_id !== null).length;
  redirect(
    `/transactions?imported=${toInsert.length}&categorized=${categorized}${skipped > 0 ? `&skipped=${skipped}` : ""}`
  );
}
