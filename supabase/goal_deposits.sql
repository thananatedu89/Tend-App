create table if not exists goal_deposits (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references goals(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount       numeric not null check (amount > 0),
  note         text,
  occurred_at  date not null default current_date,
  created_at   timestamptz not null default now()
);

alter table goal_deposits enable row level security;

create policy "Users manage own goal deposits"
  on goal_deposits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
