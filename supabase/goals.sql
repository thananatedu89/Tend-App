create table if not exists goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  target_amount numeric not null check (target_amount > 0),
  saved_amount  numeric not null default 0 check (saved_amount >= 0),
  created_at    timestamptz not null default now()
);

alter table goals enable row level security;

create policy "Users manage own goals"
  on goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
