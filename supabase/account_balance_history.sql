create table if not exists account_balance_history (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  balance      numeric not null,
  recorded_at  date not null default current_date,
  created_at   timestamptz not null default now(),
  unique (account_id, recorded_at)
);

alter table account_balance_history enable row level security;

create policy "Users manage own balance history"
  on account_balance_history for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
