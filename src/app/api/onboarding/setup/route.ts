import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth } from "@/lib/month";

type SetupPayload = {
  categories: { name: string; icon: string; color: string }[];
  budget: number | null;
  account: { name: string; balance: number } | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categories, budget, account }: SetupPayload = await req.json();

  if (categories.length > 0) {
    const { error } = await supabase
      .from("categories")
      .insert(categories.map((c) => ({ user_id: user.id, name: c.name, icon: c.icon, color: c.color })));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (budget && budget > 0) {
    const { error } = await supabase
      .from("budgets")
      .upsert({ user_id: user.id, month: startOfMonth(), total_amount: budget }, { onConflict: "user_id,month" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (account?.name?.trim()) {
    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name: account.name.trim(),
      balance: account.balance,
      balance_updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
