"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createWallet(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/wallets?error=Name+is+required");

  const { data: wallet, error } = await supabase
    .from("wallets")
    .insert({ name, owner_id: userData.user.id })
    .select("id")
    .single();

  if (error || !wallet) redirect(`/wallets?error=${encodeURIComponent(error?.message ?? "Failed to create")}`);

  // Add creator as owner member
  await supabase.from("wallet_members").insert({
    wallet_id: wallet.id,
    user_id: userData.user.id,
    role: "owner",
  });

  revalidatePath("/wallets");
  redirect(`/wallets/${wallet.id}`);
}

export async function renameWallet(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) redirect("/wallets");

  await supabase
    .from("wallets")
    .update({ name })
    .eq("id", id)
    .eq("owner_id", userData.user.id);

  revalidatePath(`/wallets/${id}`);
  redirect(`/wallets/${id}`);
}

export async function deleteWallet(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/wallets");

  await supabase.from("wallets").delete().eq("id", id).eq("owner_id", userData.user.id);

  revalidatePath("/wallets");
  redirect("/wallets");
}

export async function createInvite(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const walletId = String(formData.get("wallet_id") ?? "");
  if (!walletId) redirect("/wallets");

  const { data: invite, error } = await supabase
    .from("wallet_invites")
    .insert({ wallet_id: walletId, invited_by: userData.user.id })
    .select("token")
    .single();

  if (error || !invite) redirect(`/wallets/${walletId}?error=Could+not+create+invite`);

  revalidatePath(`/wallets/${walletId}`);
  redirect(`/wallets/${walletId}?invite=${invite.token}`);
}

export async function acceptInvite(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const token = String(formData.get("token") ?? "");
    redirect(`/login?next=/wallets/invite/${token}`);
  }

  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/wallets");

  const { data: invite } = await supabase
    .from("wallet_invites")
    .select("id, wallet_id, accepted_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) redirect("/wallets?error=Invite+not+found");
  if (invite.accepted_at) redirect(`/wallets/${invite.wallet_id}`);
  if (new Date(invite.expires_at) < new Date()) redirect("/wallets?error=Invite+has+expired");

  // Add member
  await supabase.from("wallet_members").upsert(
    { wallet_id: invite.wallet_id, user_id: userData.user.id, role: "member" },
    { onConflict: "wallet_id,user_id" },
  );

  // Mark invite accepted
  await supabase
    .from("wallet_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  revalidatePath("/wallets");
  redirect(`/wallets/${invite.wallet_id}`);
}

export async function settleWallet(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const walletId = String(formData.get("wallet_id") ?? "");
  if (!walletId) redirect("/wallets");

  await supabase.from("wallet_settlements").insert({
    wallet_id: walletId,
    settled_by: userData.user.id,
  });

  revalidatePath(`/wallets/${walletId}`);
  redirect(`/wallets/${walletId}?settled=1`);
}

export async function leaveWallet(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const walletId = String(formData.get("wallet_id") ?? "");
  if (!walletId) redirect("/wallets");

  await supabase
    .from("wallet_members")
    .delete()
    .eq("wallet_id", walletId)
    .eq("user_id", userData.user.id);

  revalidatePath("/wallets");
  redirect("/wallets");
}

export async function removeMember(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const walletId = String(formData.get("wallet_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  if (!walletId || !userId) redirect("/wallets");

  await supabase
    .from("wallet_members")
    .delete()
    .eq("wallet_id", walletId)
    .eq("user_id", userId);

  revalidatePath(`/wallets/${walletId}`);
  redirect(`/wallets/${walletId}`);
}
