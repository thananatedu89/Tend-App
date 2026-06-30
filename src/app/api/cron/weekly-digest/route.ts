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
  const thisMonthStart = startOfMonth();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .order("user_id");

  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];

  await Promise.allSettled(
    userIds.map(async (userId) => {
      const { data: txns } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .gte("occurred_at", thisMonthStart)
        .lt("amount", 0);

      const spent = (txns ?? []).reduce((s, t) => s + Math.abs(t.amount), 0);

      const { data: budget } = await supabase
        .from("budgets")
        .select("total_amount")
        .eq("user_id", userId)
        .eq("month", thisMonthStart)
        .maybeSingle();

      let body: string;
      if (budget) {
        const left = budget.total_amount - spent;
        body =
          left > 0
            ? `Spent ${formatThb(spent)} so far. ${formatThb(left)} left this month.`
            : `Spent ${formatThb(spent)} — ${formatThb(Math.abs(left))} over budget.`;
      } else {
        body = `Spent ${formatThb(spent)} this month.`;
      }

      await sendPushToUser(userId, { title: "Weekly digest", body, url: "/" });
    }),
  );

  return NextResponse.json({ ok: true, users: userIds.length });
}
