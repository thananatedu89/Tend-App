create table if not exists transaction_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  amount      numeric not null check (amount > 0),
  category_id uuid references categories(id) on delete set null,
  account_id  uuid references accounts(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

alter table transaction_templates enable row level security;

create policy "Users manage own templates"
  on transaction_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
