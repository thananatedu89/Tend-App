import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await sendPushToUser(userData.user.id, {
    title: "Test notification",
    body: "Push notifications are working!",
    url: "/",
  });

  return NextResponse.json({ ok: true });
}
