import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createServiceClient();

  async function updateProfile(customerId: string, patch: ProfileUpdate) {
    await db.from("profiles").update(patch).eq("stripe_customer_id", customerId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        // Lifetime purchase
        await updateProfile(session.customer as string, {
          subscription_tier:     "plus",
          subscription_status:   "active",
          subscription_interval: "lifetime",
          subscription_end_at:   null,
        });
      } else if (session.mode === "subscription" && session.subscription) {
        // Subscription checkout — set Plus immediately so the success page reflects the new tier.
        // customer.subscription.created also fires shortly after, but this avoids a race where
        // the user lands on /upgrade?success=1 before that event is processed.
        const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
        const interval = sub.items.data[0]?.price.recurring?.interval === "year" ? "annual" : "monthly";
        const endAt = (sub as unknown as { current_period_end: number }).current_period_end;
        await updateProfile(session.customer as string, {
          subscription_tier:     "plus",
          subscription_status:   "active",
          subscription_interval: interval,
          subscription_end_at:   new Date(endAt * 1000).toISOString(),
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub      = event.data.object as Stripe.Subscription;
      const interval = sub.items.data[0]?.price.recurring?.interval === "year" ? "annual" : "monthly";
      const active   = ["active", "trialing"].includes(sub.status);
      const endAt    = (sub as unknown as { current_period_end: number }).current_period_end;

      await updateProfile(sub.customer as string, {
        subscription_tier:     active ? "plus" : "free",
        subscription_status:   sub.status,
        subscription_interval: interval,
        subscription_end_at:   new Date(endAt * 1000).toISOString(),
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await updateProfile(sub.customer as string, {
        subscription_tier:     "free",
        subscription_status:   "canceled",
        subscription_interval: null,
        subscription_end_at:   null,
      });
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      await updateProfile(inv.customer as string, { subscription_status: "past_due" });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
