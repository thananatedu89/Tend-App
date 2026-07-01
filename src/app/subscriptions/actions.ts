"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleRecurring(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const value = formData.get("is_recurring") === "1";

  if (!id) return;

  await supabase
    .from("transactions")
    .update({ is_recurring: value })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/subscriptions");
}
