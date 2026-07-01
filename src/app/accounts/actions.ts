"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function snapshotBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  userId: string,
  balance: number,
) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("account_balance_history").upsert(
    { account_id: accountId, user_id: userId, balance, recorded_at: today },
    { onConflict: "account_id,recorded_at" },
  );
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) redirect("/accounts?error=Enter+an+account+name");

  const balanceRaw = parseFloat(formData.get("balance") as string);
  const balance = isNaN(balanceRaw) ? 0 : balanceRaw;

  const { data: inserted, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userData.user.id,
      name,
      balance,
      balance_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) redirect(`/accounts?error=${encodeURIComponent(error.message)}`);

  await snapshotBalance(supabase, inserted.id, userData.user.id, balance);

  revalidatePath("/accounts");
  revalidatePath("/net-worth");
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

  await snapshotBalance(supabase, id, userData.user.id, balance);

  revalidatePath("/accounts");
  revalidatePath("/net-worth");
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
  revalidatePath("/net-worth");
  revalidatePath("/transactions");
  redirect("/accounts?toast=Account+removed");
}

export async function transferFunds(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const fromId = String(formData.get("from_account_id") ?? "");
  const toId = String(formData.get("to_account_id") ?? "");
  const amountRaw = parseFloat(formData.get("amount") as string);
  const amount = isNaN(amountRaw) ? 0 : amountRaw;

  if (!fromId || !toId || fromId === toId || amount <= 0) {
    redirect("/accounts/transfer?error=Invalid+transfer+details");
  }

  const { data: accts } = await supabase
    .from("accounts")
    .select("id, name, balance")
    .in("id", [fromId, toId])
    .eq("user_id", userData.user.id);

  if (!accts || accts.length !== 2) {
    redirect("/accounts/transfer?error=Accounts+not+found");
  }

  const fromAcc = accts.find((a) => a.id === fromId)!;
  const toAcc = accts.find((a) => a.id === toId)!;
  const now = new Date().toISOString();
  const userId = userData.user.id;

  await Promise.all([
    supabase
      .from("accounts")
      .update({ balance: fromAcc.balance - amount, balance_updated_at: now })
      .eq("id", fromId)
      .eq("user_id", userId),
    supabase
      .from("accounts")
      .update({ balance: toAcc.balance + amount, balance_updated_at: now })
      .eq("id", toId)
      .eq("user_id", userId),
  ]);

  await Promise.all([
    snapshotBalance(supabase, fromId, userId, fromAcc.balance - amount),
    snapshotBalance(supabase, toId, userId, toAcc.balance + amount),
  ]);

  revalidatePath("/accounts");
  revalidatePath("/net-worth");
  redirect("/accounts?toast=Transfer+complete");
}
