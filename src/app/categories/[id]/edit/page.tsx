import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCategory, deleteCategory } from "../../actions";

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, icon")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!category) notFound();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Edit category</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          Rename it, add an icon, or remove it entirely.
        </p>

        <form action={updateCategory} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={category.id} />

          <div className="flex gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="icon" className="font-body text-sm text-ink/70">
                Icon
              </label>
              <input
                id="icon"
                name="icon"
                type="text"
                maxLength={4}
                defaultValue={category.icon ?? ""}
                placeholder="★"
                className="font-body w-14 rounded-md border border-mist bg-paper px-2 py-2 text-center text-ink outline-none focus:border-sage placeholder:text-ink/20"
              />
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="name" className="font-body text-sm text-ink/70">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                maxLength={50}
                required
                defaultValue={category.name}
                autoFocus
                className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
              />
            </div>
          </div>

          {error && <p className="font-body text-sm text-ink/70">{error}</p>}

          <button
            type="submit"
            className="font-body mt-2 rounded-md bg-ink px-3 py-2 text-paper transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </form>

        <form action={deleteCategory} className="mt-3">
          <input type="hidden" name="id" value={category.id} />
          <button
            type="submit"
            className="font-body w-full rounded-md border border-mist px-3 py-2 text-ink/60 transition-opacity hover:opacity-70"
          >
            Remove this category
          </button>
        </form>
        <p className="font-body mt-2 text-center text-xs text-ink/40">
          Existing transactions will become uncategorised.
        </p>

        <a
          href="/categories"
          className="font-body mt-6 block text-center text-sm text-sage underline"
        >
          Cancel
        </a>
      </div>
    </main>
  );
}
