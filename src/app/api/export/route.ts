import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, note, occurred_at, categories(name)")
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = [
    ["Date", "Type", "Category", "Amount", "Note"].join(","),
    ...(transactions ?? []).map((t) => {
      const type = t.amount < 0 ? "Expense" : "Income";
      const amount = Math.abs(t.amount).toFixed(2);
      const category = t.categories?.name ?? "";
      return [
        csvEscape(t.occurred_at),
        csvEscape(type),
        csvEscape(category),
        amount,
        csvEscape(t.note),
      ].join(",");
    }),
  ];

  const csv = rows.join("\n");
  const filename = `tend-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
