-- Wallets
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Wallet members
create table if not exists wallet_members (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (wallet_id, user_id)
);

-- Wallet invites
create table if not exists wallet_invites (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

-- wallet_id on transactions
alter table transactions add column if not exists wallet_id uuid references wallets(id) on delete set null;

-- RLS
alter table wallets enable row level security;
alter table wallet_members enable row level security;
alter table wallet_invites enable row level security;

-- wallets policies
create policy "Members can view their wallets"
  on wallets for select
  using (
    auth.uid() = owner_id or
    exists (select 1 from wallet_members where wallet_id = wallets.id and user_id = auth.uid())
  );

create policy "Owner can insert wallet"
  on wallets for insert
  with check (auth.uid() = owner_id);

create policy "Owner can update wallet"
  on wallets for update
  using (auth.uid() = owner_id);

create policy "Owner can delete wallet"
  on wallets for delete
  using (auth.uid() = owner_id);

-- wallet_members policies
create policy "Members can view wallet membership"
  on wallet_members for select
  using (
    user_id = auth.uid() or
    exists (select 1 from wallet_members wm2 where wm2.wallet_id = wallet_members.wallet_id and wm2.user_id = auth.uid())
  );

create policy "Owner can manage members"
  on wallet_members for all
  using (
    exists (select 1 from wallets where id = wallet_members.wallet_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from wallets where id = wallet_members.wallet_id and owner_id = auth.uid())
  );

create policy "User can add themselves as member"
  on wallet_members for insert
  with check (user_id = auth.uid());

create policy "User can leave wallet"
  on wallet_members for delete
  using (user_id = auth.uid());

-- wallet_invites policies
create policy "Wallet members can create invites"
  on wallet_invites for insert
  with check (
    exists (select 1 from wallet_members where wallet_id = wallet_invites.wallet_id and user_id = auth.uid())
    or exists (select 1 from wallets where id = wallet_invites.wallet_id and owner_id = auth.uid())
  );

create policy "Anyone can read invites"
  on wallet_invites for select
  using (true);

create policy "Invited_by can update invite"
  on wallet_invites for update
  using (auth.uid() = invited_by or exists (select 1 from wallets where id = wallet_invites.wallet_id and owner_id = auth.uid()));
