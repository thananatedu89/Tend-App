create table if not exists profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text,
  stripe_customer_id    text unique,
  subscription_tier     text not null default 'free' check (subscription_tier in ('free', 'plus')),
  subscription_status   text,                        -- active | canceled | past_due | trialing
  subscription_interval text,                        -- monthly | annual | lifetime
  subscription_end_at   timestamptz,
  updated_at            timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Back-fill a row for every user who already exists
insert into profiles (id)
select id from auth.users
on conflict do nothing;
