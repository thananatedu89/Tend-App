"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const rawAmount = Number(formData.get("amount"));
  const type = String(formData.get("type") ?? "expense");
  const categoryId = String(formData.get("category_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const occurredAt = String(formData.get("occurred_at") ?? "");

  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    redirect("/transactions/new?error=Enter+an+amount+greater+than+zero");
  }

  const amount = type === "expense" ? -rawAmount : rawAmount;

  const { error } = await supabase.from("transactions").insert({
    user_id: userData.user.id,
    category_id: categoryId || null,
    amount,
    note: note || null,
    occurred_at: occurredAt || new Date().toISOString().slice(0, 10),
  });

  if (error) {
    redirect(`/transactions/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const rawAmount = Number(formData.get("amount"));
  const type = String(formData.get("type") ?? "expense");
  const categoryId = String(formData.get("category_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const occurredAt = String(formData.get("occurred_at") ?? "");

  if (!id) redirect("/");
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    redirect(`/transactions/${id}/edit?error=Enter+an+amount+greater+than+zero`);
  }

  const amount = type === "expense" ? -rawAmount : rawAmount;

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId || null,
      amount,
      note: note || null,
      occurred_at: occurredAt || new Date().toISOString().slice(0, 10),
    })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) {
    redirect(`/transactions/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/");

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) {
    redirect(`/transactions/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  redirect("/transactions");
}
