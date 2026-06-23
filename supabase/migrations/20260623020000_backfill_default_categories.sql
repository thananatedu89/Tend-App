-- Back-fill default categories for accounts created before the seeding trigger existed.
insert into public.categories (user_id, name, icon, is_default)
select u.id, c.name, c.icon, true
from auth.users u
cross join (values
  ('Food & drink', 'utensils'),
  ('Transport', 'car'),
  ('Bills & utilities', 'receipt'),
  ('Shopping', 'bag'),
  ('Health', 'heart'),
  ('Entertainment', 'film'),
  ('Income', 'arrow-down'),
  ('Other', 'circle')
) as c(name, icon)
where not exists (
  select 1 from public.categories existing where existing.user_id = u.id
);
