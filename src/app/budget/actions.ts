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

export async function setBudgetLines(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const budgetId = formData.get("budget_id");
  if (typeof budgetId !== "string" || !budgetId) {
    redirect("/budget?error=Set+a+monthly+budget+first");
  }

  const toUpsert: { budget_id: string; category_id: string; allocated_amount: number }[] = [];
  const categoryIdsToClear: string[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("line_")) continue;
    const categoryId = key.slice("line_".length);
    const amount = Number(value);

    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(amount) && amount > 0) {
      toUpsert.push({ budget_id: budgetId, category_id: categoryId, allocated_amount: amount });
    } else {
      categoryIdsToClear.push(categoryId);
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("budget_lines")
      .upsert(toUpsert, { onConflict: "budget_id,category_id" });
    if (error) {
      redirect(`/budget?error=${encodeURIComponent(error.message)}`);
    }
  }

  if (categoryIdsToClear.length > 0) {
    const { error } = await supabase
      .from("budget_lines")
      .delete()
      .eq("budget_id", budgetId)
      .in("category_id", categoryIdsToClear);
    if (error) {
      redirect(`/budget?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/budget");
  redirect("/budget");
}

export async function applyRollover(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const rolloverAmount = Number(formData.get("rollover_amount"));
  if (!Number.isFinite(rolloverAmount) || rolloverAmount <= 0) redirect("/budget");

  const { data: budget } = await supabase
    .from("budgets")
    .select("id, total_amount")
    .eq("month", startOfMonth())
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!budget) redirect("/budget?error=Set+a+budget+for+this+month+first");

  const { error } = await supabase
    .from("budgets")
    .update({ total_amount: budget.total_amount + rolloverAmount })
    .eq("id", budget.id)
    .eq("user_id", userData.user.id);

  if (error) redirect(`/budget?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/budget");
  redirect("/budget");
}
