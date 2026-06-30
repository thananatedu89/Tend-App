create table if not exists wallet_settlements (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  settled_by uuid not null references auth.users(id) on delete cascade,
  settled_at timestamptz not null default now()
);

alter table wallet_settlements enable row level security;

create policy "Wallet members can view settlements"
  on wallet_settlements for select
  using (is_wallet_member(wallet_id));

create policy "Wallet members can create settlements"
  on wallet_settlements for insert
  with check (is_wallet_member(wallet_id) and auth.uid() = settled_by);
