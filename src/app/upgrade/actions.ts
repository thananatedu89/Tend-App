"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, PRICES } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tend-app-dusky.vercel.app";

async function getOrCreateCustomer(userId: string, email: string | undefined) {
  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await service
    .from("profiles")
    .upsert({ id: userId, stripe_customer_id: customer.id });

  return customer.id;
}

export async function startCheckout(formData: FormData) {
  const plan = formData.get("plan") as string;
  if (!["monthly", "annual", "lifetime"].includes(plan)) redirect("/upgrade");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/upgrade");

  const customerId = await getOrCreateCustomer(user.id, user.email);
  const isLifetime = plan === "lifetime";

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: isLifetime ? "payment" : "subscription",
    line_items: [{ price: PRICES[plan as "monthly" | "annual" | "lifetime"], quantity: 1 }],
    success_url: `${APP_URL}/upgrade?success=1`,
    cancel_url:  `${APP_URL}/upgrade`,
  });

  redirect(session.url!);
}

export async function openPortal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) redirect("/upgrade");

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${APP_URL}/settings`,
  });

  redirect(session.url);
}
