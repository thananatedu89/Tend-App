"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function quickLog(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const amount = Number(formData.get("amount"));
  const categoryId = formData.get("category_id");
  const today = new Date().toISOString().slice(0, 10);

  if (!Number.isFinite(amount) || amount <= 0) redirect("/");
  if (typeof categoryId !== "string" || !categoryId) redirect("/");

  await supabase.from("transactions").insert({
    user_id: userData.user.id,
    amount: -amount,
    category_id: categoryId,
    occurred_at: today,
    note: null,
    account_id: null,
  });

  revalidatePath("/");
  redirect("/");
}
