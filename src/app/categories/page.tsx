import { createClient } from "@/lib/supabase/server";
import { createCategory } from "./actions";
import { CategoryIcon, colorStyles } from "@/components/CategoryIcon";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon, color")
    .order("name");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Categories</h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          The labels you use to organise every transaction.
        </p>

        {categories && categories.length > 0 && (
          <div className="flex flex-col divide-y divide-mist rounded-md border border-mist mb-8">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/categories/${cat.id}/edit`}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-mist/30 transition-colors"
              >
                <span className="font-body text-sm flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full shrink-0" style={{ background: colorStyles(cat.color).bg, color: colorStyles(cat.color).fg }}>
                    <CategoryIcon icon={cat.icon} size={12} />
                  </span>
                  {cat.name}
                </span>
                <span className="font-body text-xs text-ink/40">Edit</span>
              </a>
            ))}
          </div>
        )}

        <form action={createCategory} className="flex gap-2">
          <input
            name="icon"
            type="text"
            maxLength={4}
            placeholder="★"
            autoComplete="off"
            className="font-body w-12 rounded-md border border-mist bg-paper px-2 py-2 text-center text-sm text-ink outline-none focus:border-sage placeholder:text-ink/20"
          />
          <input
            name="name"
            type="text"
            maxLength={50}
            required
            placeholder="New category"
            autoComplete="off"
            className="font-body flex-1 rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sage placeholder:text-ink/30"
          />
          <button
            type="submit"
            className="font-body rounded-md bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
          >
            Add
          </button>
        </form>

        {error && (
          <p className="font-body mt-3 text-sm text-ink/70">{error}</p>
        )}

        <div className="mt-8 flex flex-col gap-3 text-center">
          <a href="/accounts" className="font-body text-sm text-sage underline">
            Manage accounts
          </a>
          <a href="/budget" className="font-body text-sm text-sage underline">
            Back to budget
          </a>
        </div>
      </div>
    </main>
  );
}
