import { createServiceClient } from "./supabase/service";

export async function isPlus(userId: string): Promise<boolean> {
  const db = createServiceClient();
  const { data } = await db
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .maybeSingle();
  return data?.subscription_tier === "plus";
}
