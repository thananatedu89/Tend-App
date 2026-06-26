"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim().slice(0, 50);
  if (!name) redirect("/categories?error=Enter+a+category+name");

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: userData.user.id, name });

  if (error) {
    redirect(`/categories?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/categories");
  revalidatePath("/");
  redirect("/categories");
}

export async function updateCategory(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 50);

  if (!id) redirect("/categories");
  if (!name) redirect(`/categories/${id}/edit?error=Enter+a+category+name`);

  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) {
    redirect(`/categories/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/categories");
  revalidatePath("/");
  redirect("/categories");
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/categories");

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) {
    redirect(`/categories/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/categories");
  revalidatePath("/");
  redirect("/categories");
}
