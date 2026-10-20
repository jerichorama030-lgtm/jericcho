-- Run this in Supabase SQL Editor as the project owner.
-- The panel uses the existing public.products and public.orders tables from the
-- Artify migration. These policies permit authenticated admins only to manage
-- products and read/update orders. They do NOT expose order data to customers.
-- IMPORTANT: Supabase's JWT app_metadata.role must be 'admin' for the account.

create or replace function public.is_artify_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, auth
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'user') = 'admin';
$$;

revoke all on function public.is_artify_admin() from public, anon;
grant execute on function public.is_artify_admin() to authenticated;

grant select, insert, update on public.products to authenticated;
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
  on public.products for all to authenticated
  using (public.is_artify_admin())
  with check (public.is_artify_admin());

grant select, update on public.orders to authenticated;
drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders"
  on public.orders for select to authenticated
  using (public.is_artify_admin());
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders"
  on public.orders for update to authenticated
  using (public.is_artify_admin())
  with check (public.is_artify_admin());

-- Do not grant direct access to order_items from the browser. If you later need
-- item-level details, expose them through a narrowly scoped admin-only function.

-- Promote an existing account as a trusted project owner. Replace UUID:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--     || jsonb_build_object('role', 'admin')
-- where id = 'AUTH_USER_UUID';
-- Then sign out and sign back in to refresh the JWT role claim.
