"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) redirect("/accounts?error=Enter+an+account+name");

  const balanceRaw = parseFloat(formData.get("balance") as string);
  const balance = isNaN(balanceRaw) ? 0 : balanceRaw;

  const { error } = await supabase
    .from("accounts")
    .insert({
      user_id: userData.user.id,
      name,
      balance,
      balance_updated_at: new Date().toISOString(),
    });

  if (error) redirect(`/accounts?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  redirect("/accounts?toast=Account+added");
}

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const balanceRaw = parseFloat(formData.get("balance") as string);
  const balance = isNaN(balanceRaw) ? 0 : balanceRaw;

  if (!id) redirect("/accounts");
  if (!name) redirect(`/accounts/${id}/edit?error=Enter+an+account+name`);

  const { error } = await supabase
    .from("accounts")
    .update({ name, balance, balance_updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) redirect(`/accounts/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  redirect("/accounts?toast=Account+saved");
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/accounts");

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) redirect(`/accounts/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  redirect("/accounts?toast=Account+removed");
}
