import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "./actions";

export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 px-6 py-4">
        <a
          href="/settings"
          className="font-body text-sm text-ink/40 hover:text-ink/70 transition-colors"
        >
          ←
        </a>
        <h1 className="font-display text-lg">Delete account</h1>
      </header>

      <div className="flex flex-col gap-8 px-6 pb-12 max-w-sm">
        <div className="flex flex-col gap-3">
          <p className="font-body text-sm text-ink/70 leading-relaxed">
            This will permanently delete your account and everything in it —
            transactions, budgets, goals, categories, and accounts.
          </p>
          <p className="font-body text-sm text-ink/70 leading-relaxed">
            This cannot be undone.
          </p>
          {user.email && (
            <p className="font-body text-sm text-ink/40">
              Account: {user.email}
            </p>
          )}
        </div>

        <form action={deleteAccount} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="font-body text-sm text-ink/70">
              Type DELETE to confirm
            </label>
            <input
              id="confirm"
              name="confirm"
              type="text"
              required
              autoComplete="off"
              placeholder="DELETE"
              className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink placeholder:text-ink/25"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-ink/60">
              Please type DELETE exactly to confirm.
            </p>
          )}

          <button
            type="submit"
            className="font-body w-full rounded-full bg-ink px-4 py-3 text-paper text-sm transition-opacity hover:opacity-70"
          >
            Delete my account
          </button>

          <a
            href="/settings"
            className="font-body text-center text-sm text-ink/40 hover:text-ink/60 transition-colors"
          >
            Cancel
          </a>
        </form>
      </div>
    </main>
  );
}
