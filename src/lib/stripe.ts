import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!) as Stripe;
  }
  return _stripe;
}

export const PRICES: Record<"monthly" | "annual" | "lifetime", string> = {
  monthly:  process.env.STRIPE_PRICE_MONTHLY  ?? "",
  annual:   process.env.STRIPE_PRICE_ANNUAL   ?? "",
  lifetime: process.env.STRIPE_PRICE_LIFETIME ?? "",
};
