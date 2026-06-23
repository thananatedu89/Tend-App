-- Tend — Phase 0 schema
-- Target: Postgres (Supabase). Run after Supabase project is created.
-- Auth: assumes Supabase Auth — `user_id` references auth.users(id).

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  amount numeric(12, 2) not null,
  note text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null, -- first day of the month this budget covers
  total_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create table if not exists budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  allocated_amount numeric(12, 2) not null,
  unique (budget_id, category_id)
);

create index if not exists idx_transactions_user_date on transactions (user_id, occurred_at desc);
create index if not exists idx_transactions_category on transactions (category_id);

-- Row-level security: each user only sees their own rows
alter table categories enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table budget_lines enable row level security;

create policy "own categories" on categories for all using (auth.uid() = user_id);
create policy "own accounts" on accounts for all using (auth.uid() = user_id);
create policy "own transactions" on transactions for all using (auth.uid() = user_id);
create policy "own budgets" on budgets for all using (auth.uid() = user_id);
create policy "own budget_lines" on budget_lines for all using (
  auth.uid() = (select user_id from budgets where budgets.id = budget_lines.budget_id)
);
