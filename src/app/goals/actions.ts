"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string).trim();
  const target = parseFloat(formData.get("target_amount") as string);
  if (!name || isNaN(target) || target <= 0) return;

  await supabase.from("goals").update({ name, target_amount: target }).eq("id", id);
  revalidatePath(`/goals/${id}`);
  redirect(`/goals/${id}?toast=Goal+updated`);
}

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const target = parseFloat(formData.get("target_amount") as string);
  if (!name || isNaN(target) || target <= 0) redirect("/goals/new?error=invalid");

  const { error } = await supabase.from("goals").insert({
    user_id: userData.user.id,
    name,
    target_amount: target,
  });

  if (error) redirect(`/goals/new?error=${encodeURIComponent(error.message)}`);
  redirect("/goals?toast=Goal+created");
}

export async function addSavings(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = formData.get("id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const note = (formData.get("note") as string | null)?.trim() || null;
  const occurred_at =
    (formData.get("occurred_at") as string | null) ||
    new Date().toISOString().slice(0, 10);

  if (isNaN(amount) || amount <= 0) redirect(`/goals/${id}`);

  const { data: goal } = await supabase
    .from("goals")
    .select("saved_amount")
    .eq("id", id)
    .single();

  if (!goal) redirect("/goals");

  await supabase.from("goal_deposits").insert({
    goal_id: id,
    user_id: userData.user.id,
    amount,
    note,
    occurred_at,
  });

  await supabase
    .from("goals")
    .update({ saved_amount: Math.min(goal.saved_amount + amount, 999999999) })
    .eq("id", id);

  redirect(`/goals/${id}?toast=Deposit+added`);
}

export async function removeDeposit(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const depositId = formData.get("deposit_id") as string;
  const goalId = formData.get("goal_id") as string;

  const { data: deposit } = await supabase
    .from("goal_deposits")
    .select("amount")
    .eq("id", depositId)
    .single();

  if (!deposit) redirect(`/goals/${goalId}`);

  await supabase.from("goal_deposits").delete().eq("id", depositId);

  const { data: goal } = await supabase
    .from("goals")
    .select("saved_amount")
    .eq("id", goalId)
    .single();

  if (goal) {
    await supabase
      .from("goals")
      .update({ saved_amount: Math.max(0, goal.saved_amount - deposit.amount) })
      .eq("id", goalId);
  }

  redirect(`/goals/${goalId}?toast=Deposit+removed`);
}

export async function deleteGoal(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  await supabase.from("goals").delete().eq("id", id);
  redirect("/goals?toast=Goal+deleted");
}
