"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth } from "@/lib/month";

export async function setBudget(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const totalAmount = Number(formData.get("total_amount"));
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    redirect("/budget?error=Enter+an+amount+greater+than+zero");
  }

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: userData.user.id,
      month: startOfMonth(),
      total_amount: totalAmount,
    },
    { onConflict: "user_id,month" },
  );

  if (error) {
    redirect(`/budget?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect("/");
}
