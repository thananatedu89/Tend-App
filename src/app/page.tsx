import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-body text-sm text-ink/60">{data.user?.email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="font-body text-sm text-sage underline"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-body text-sm text-sage">Left to spend this month</p>
        <p className="font-display text-5xl tabular-nums">฿0</p>
        <p className="font-body text-sm text-ink/60">
          Phase 1: manual entry, categories, and the real number land here.
        </p>
      </div>
    </main>
  );
}
