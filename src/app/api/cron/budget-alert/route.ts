import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push";
import { formatThb } from "@/lib/format";
import { startOfMonth } from "@/lib/month";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const monthStart = startOfMonth();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // All users with push subscriptions
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .order("user_id");

  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  let notified = 0;

  await Promise.allSettled(
    userIds.map(async (userId) => {
      // Get their monthly budget
      const { data: budget } = await supabase
        .from("budgets")
        .select("total_amount")
        .eq("user_id", userId)
        .eq("month", monthStart)
        .maybeSingle();

      if (!budget?.total_amount) return;
      const limit = budget.total_amount;

      // Spending up to end of yesterday
      const { data: prevTxns } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .gte("occurred_at", monthStart)
        .lte("occurred_at", yesterday)
        .lt("amount", 0);

      // Spending including today
      const { data: currTxns } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .gte("occurred_at", monthStart)
        .lte("occurred_at", today)
        .lt("amount", 0);

      const prevSpent = (prevTxns ?? []).reduce((s, t) => s + Math.abs(t.amount), 0);
      const currSpent = (currTxns ?? []).reduce((s, t) => s + Math.abs(t.amount), 0);

      const prevPct = prevSpent / limit;
      const currPct = currSpent / limit;

      // 80% threshold — only fire on the day it's first crossed
      if (prevPct < 0.8 && currPct >= 0.8 && currPct < 1.0) {
        await sendPushToUser(userId, {
          title: "80% of budget used",
          body: `You've spent ${formatThb(currSpent)} of your ${formatThb(limit)} budget. ${formatThb(limit - currSpent)} remaining.`,
          url: "/budget",
        });
        notified++;
      }

      // 100% threshold — only fire on the day it's first crossed
      if (prevPct < 1.0 && currPct >= 1.0) {
        await sendPushToUser(userId, {
          title: "Budget exceeded",
          body: `You've spent ${formatThb(currSpent)} — ${formatThb(currSpent - limit)} over your ${formatThb(limit)} budget.`,
          url: "/budget",
        });
        notified++;
      }
    }),
  );

  return NextResponse.json({ ok: true, notified });
}
