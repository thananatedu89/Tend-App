import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push";
import { formatThb } from "@/lib/format";
import { getSubscriptions } from "@/lib/bills";

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
  since.setMonth(since.getMonth() - 6);
  const sinceStr = since.toISOString().slice(0, 10);

  let notified = 0;

  await Promise.allSettled(
    userIds.map(async (userId) => {
      // Fetch all expenses (flagged + unflagged) for pattern detection
      const { data: txns } = await supabase
        .from("transactions")
        .select("id, amount, note, category_id, occurred_at, is_recurring, categories(name)")
        .eq("user_id", userId)
        .lt("amount", 0)
        .gte("occurred_at", sinceStr)
        .order("occurred_at", { ascending: false });

      if (!txns || txns.length === 0) return;

      const all = (txns ?? []).map((t) => ({
        ...t,
        categories: t.categories && !Array.isArray(t.categories) ? t.categories : null,
      }));

      // Get all detected subscriptions and find those due tomorrow
      const detected = getSubscriptions(all);
      const dueTomorrow = detected.filter((s) => s.daysUntil === 1);

      for (const bill of dueTomorrow) {
        await sendPushToUser(userId, {
          title: "Bill due tomorrow",
          body: `${bill.label} — ${formatThb(bill.amount)} is expected tomorrow.`,
          url: "/subscriptions",
        });
        notified++;
      }
    }),
  );

  return NextResponse.json({ ok: true, notified });
}
