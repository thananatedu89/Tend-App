import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push";
import { formatThb } from "@/lib/format";
import { getUpcomingBills } from "@/lib/bills";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .order("user_id");

  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  let notified = 0;

  await Promise.allSettled(
    userIds.map(async (userId) => {
      const { data: txns } = await supabase
        .from("transactions")
        .select("amount, note, category_id, occurred_at, categories(name)")
        .eq("user_id", userId)
        .eq("is_recurring", true)
        .lt("amount", 0)
        .gte("occurred_at", sinceStr)
        .order("occurred_at", { ascending: false });

      if (!txns || txns.length === 0) return;

      const dueTomorrow = getUpcomingBills(
        txns as Parameters<typeof getUpcomingBills>[0],
        1,
      ).filter((b) => b.daysUntil === 1);

      for (const bill of dueTomorrow) {
        await sendPushToUser(userId, {
          title: "Bill due tomorrow",
          body: `${bill.label} — ${formatThb(bill.amount)} is due tomorrow.`,
          url: "/transactions/new",
        });
        notified++;
      }
    }),
  );

  return NextResponse.json({ ok: true, notified });
}
