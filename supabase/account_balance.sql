alter table accounts add column if not exists balance numeric not null default 0;
alter table accounts add column if not exists balance_updated_at timestamptz;
