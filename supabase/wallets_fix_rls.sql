-- Drop the recursive policies
drop policy if exists "Members can view their wallets" on wallets;
drop policy if exists "Members can view wallet membership" on wallet_members;
drop policy if exists "Wallet members can create invites" on wallet_invites;

-- Security-definer helper: checks membership without triggering RLS recursion
create or replace function is_wallet_member(p_wallet_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from wallet_members
    where wallet_id = p_wallet_id and user_id = auth.uid()
  )
$$;

-- Recreate wallets SELECT using the helper (no recursive subquery)
create policy "Members can view their wallets"
  on wallets for select
  using (
    auth.uid() = owner_id or
    is_wallet_member(wallets.id)
  );

-- Recreate wallet_members SELECT using the helper
create policy "Members can view wallet membership"
  on wallet_members for select
  using (
    user_id = auth.uid() or
    is_wallet_member(wallet_members.wallet_id)
  );

-- Recreate wallet_invites INSERT using the helper
create policy "Wallet members can create invites"
  on wallet_invites for insert
  with check (
    is_wallet_member(wallet_invites.wallet_id) or
    exists (select 1 from wallets where id = wallet_invites.wallet_id and owner_id = auth.uid())
  );
