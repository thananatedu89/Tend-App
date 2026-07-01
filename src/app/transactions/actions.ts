"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { formatThb } from "@/lib/format";
import { startOfMonth } from "@/lib/month";

async function uploadReceipt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File,
): Promise<string | null> {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return null;
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  return data.publicUrl;
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const rawAmount = Number(formData.get("amount"));
  const type = String(formData.get("type") ?? "expense");
  const categoryId = String(formData.get("category_id") ?? "");
  const accountId = String(formData.get("account_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const occurredAt = String(formData.get("occurred_at") ?? "");

  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    redirect("/transactions/new?error=Enter+an+amount+greater+than+zero");
  }

  const amount = type === "expense" ? -rawAmount : rawAmount;

  const receiptFile = formData.get("receipt") as File | null;
  let receiptUrl: string | null = null;
  if (receiptFile && receiptFile.size > 0) {
    receiptUrl = await uploadReceipt(supabase, userData.user.id, receiptFile);
  }

  const isRecurring = formData.get("is_recurring") === "1";
  const walletId = String(formData.get("wallet_id") ?? "");

  const { error } = await supabase.from("transactions").insert({
    user_id: userData.user.id,
    category_id: categoryId || null,
    account_id: accountId || null,
    amount,
    note: note || null,
    occurred_at: occurredAt || new Date().toISOString().slice(0, 10),
    receipt_url: receiptUrl,
    is_recurring: isRecurring,
    wallet_id: walletId || null,
  });

  if (error) {
    redirect(`/transactions/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/week");

  // Overspend push alert — fire-and-forget, don't block redirect
  if (amount < 0 && categoryId) {
    void (async () => {
      try {
        const thisMonthStart = startOfMonth();
        const [{ data: catTxns }, { data: budgetLine }, { data: cat }] = await Promise.all([
          supabase
            .from("transactions")
            .select("amount")
            .eq("category_id", categoryId)
            .eq("user_id", userData.user.id)
            .gte("occurred_at", thisMonthStart)
            .lt("amount", 0),
          supabase
            .from("budget_lines")
            .select("allocated_amount, budget_id")
            .eq("category_id", categoryId)
            .order("budget_id", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("categories")
            .select("name")
            .eq("id", categoryId)
            .maybeSingle(),
        ]);

        if (budgetLine && catTxns) {
          const spent = catTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
          if (spent > budgetLine.allocated_amount) {
            const over = spent - budgetLine.allocated_amount;
            await sendPushToUser(userData.user.id, {
              title: `${cat?.name ?? "Category"} over budget`,
              body: `${formatThb(over)} over your ${formatThb(budgetLine.allocated_amount)} budget this month.`,
              url: "/budget",
            });
          }
        }
      } catch {
        // non-critical
      }
    })();
  }

  // Total monthly budget alert — fires at 90% and 100% crossings
  if (amount < 0) {
    void (async () => {
      try {
        const thisMonthStart = startOfMonth();
        const [{ data: allTxns }, { data: budgetData }] = await Promise.all([
          supabase
            .from("transactions")
            .select("amount")
            .eq("user_id", userData.user.id)
            .gte("occurred_at", thisMonthStart)
            .lt("amount", 0),
          supabase
            .from("budgets")
            .select("total_amount")
            .eq("user_id", userData.user.id)
            .eq("month", thisMonthStart)
            .maybeSingle(),
        ]);

        if (!budgetData || !allTxns) return;
        const totalBudget = budgetData.total_amount;
        if (totalBudget <= 0) return;

        const currentSpent = allTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
        const prevSpent = currentSpent - Math.abs(amount);
        const currRatio = currentSpent / totalBudget;
        const prevRatio = prevSpent / totalBudget;

        if (prevRatio < 1 && currRatio >= 1) {
          await sendPushToUser(userData.user.id, {
            title: "Monthly budget reached",
            body: `You've used your full ${formatThb(totalBudget)} budget for ${new Date().toLocaleString("en-GB", { month: "long" })}.`,
            url: "/budget",
          });
        } else if (prevRatio < 0.9 && currRatio >= 0.9) {
          const remaining = Math.max(0, totalBudget - currentSpent);
          await sendPushToUser(userData.user.id, {
            title: "90% of budget used",
            body: `Only ${formatThb(Math.round(remaining))} left this month.`,
            url: "/budget",
          });
        }
      } catch {
        // non-critical
      }
    })();
  }

  redirect("/transactions?toast=Transaction+added");
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const rawAmount = Number(formData.get("amount"));
  const type = String(formData.get("type") ?? "expense");
  const categoryId = String(formData.get("category_id") ?? "");
  const accountId = String(formData.get("account_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const occurredAt = String(formData.get("occurred_at") ?? "");
  const walletId = String(formData.get("wallet_id") ?? "");

  if (!id) redirect("/");
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    redirect(`/transactions/${id}/edit?error=Enter+an+amount+greater+than+zero`);
  }

  const amount = type === "expense" ? -rawAmount : rawAmount;

  const isRecurring = formData.get("is_recurring") === "1";
  const receiptFile = formData.get("receipt") as File | null;
  const removeReceipt = formData.get("remove_receipt") === "1";

  // undefined = leave receipt_url unchanged in DB
  let receiptUrl: string | null | undefined = undefined;
  if (receiptFile && receiptFile.size > 0) {
    receiptUrl = await uploadReceipt(supabase, userData.user.id, receiptFile);
  } else if (removeReceipt) {
    receiptUrl = null;
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId || null,
      account_id: accountId || null,
      amount,
      note: note || null,
      occurred_at: occurredAt || new Date().toISOString().slice(0, 10),
      is_recurring: isRecurring,
      wallet_id: walletId || null,
      ...(receiptUrl !== undefined ? { receipt_url: receiptUrl } : {}),
    })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) {
    redirect(`/transactions/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  redirect("/transactions?toast=Changes+saved");
}

export async function saveAsTemplate(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const amount = parseFloat(formData.get("amount") as string);
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const accountId = String(formData.get("account_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const returnTo = String(formData.get("return_to") ?? "/transactions");

  if (!name || isNaN(amount) || amount <= 0) redirect(`${returnTo}?error=Invalid+template`);

  await supabase.from("transaction_templates").insert({
    user_id: userData.user.id,
    name,
    amount,
    category_id: categoryId,
    account_id: accountId,
    note,
  });

  revalidatePath("/transactions/new");
  redirect(`${returnTo}?toast=Template+saved`);
}

export async function deleteTemplate(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/transactions/new");

  await supabase.from("transaction_templates").delete().eq("id", id).eq("user_id", userData.user.id);

  revalidatePath("/transactions/new");
  redirect("/transactions/new?toast=Template+removed");
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

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
  redirect("/transactions?toast=Transaction+deleted");
}
