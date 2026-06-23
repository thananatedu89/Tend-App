-- Seed a calm, small set of default categories for every new user.
-- Trigger on auth.users so it fires regardless of which client created the account.

create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, icon, is_default) values
    (new.id, 'Food & drink', 'utensils', true),
    (new.id, 'Transport', 'car', true),
    (new.id, 'Bills & utilities', 'receipt', true),
    (new.id, 'Shopping', 'bag', true),
    (new.id, 'Health', 'heart', true),
    (new.id, 'Entertainment', 'film', true),
    (new.id, 'Income', 'arrow-down', true),
    (new.id, 'Other', 'circle', true);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_categories on auth.users;

create trigger on_auth_user_created_seed_categories
  after insert on auth.users
  for each row
  execute function public.seed_default_categories();
