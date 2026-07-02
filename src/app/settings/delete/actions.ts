"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";

export async function deleteAccount(formData: FormData) {
  const confirm = (formData.get("confirm") as string ?? "").trim().toUpperCase();
  if (confirm !== "DELETE") {
    redirect("/settings/delete?error=1");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  // Cancel active Stripe subscription before deleting the account
  const { data: profile } = await service
    .from("profiles")
    .select("stripe_customer_id, subscription_tier, subscription_interval, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.stripe_customer_id &&
    profile?.subscription_tier === "plus" &&
    profile?.subscription_interval !== "lifetime" &&
    profile?.subscription_status === "active"
  ) {
    const subs = await getStripe().subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    });
    if (subs.data[0]) {
      await getStripe().subscriptions.cancel(subs.data[0].id);
    }
  }

  // Delete the auth user — cascades all app data via ON DELETE CASCADE
  await service.auth.admin.deleteUser(user.id);

  // Clear the session cookie
  await supabase.auth.signOut();

  redirect("/login?notice=account-deleted");
}
