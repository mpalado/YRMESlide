-- YRME Supabase security migration
-- Run this once in Supabase SQL Editor, then refresh the PostgREST schema.

alter table public.aircon_products
  add column if not exists is_active boolean not null default true,
  add column if not exists stock_status text not null default 'in_stock';

update public.aircon_products
set is_active = false
where coalesce(stock_status, 'in_stock') = 'out_stock';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.role() = 'authenticated'
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.aircon_products enable row level security;
alter table public.aircon_products force row level security;

do $$
declare policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'aircon_products'
  loop
    execute format(
      'drop policy %I on public.aircon_products',
      policy_record.policyname
    );
  end loop;
end $$;

create policy aircon_public_read_active
on public.aircon_products
for select
to anon, authenticated
using (
  is_active
  and coalesce(stock_status, 'in_stock') <> 'out_stock'
);

create policy aircon_admin_read_all
on public.aircon_products
for select
to authenticated
using (public.is_admin());

create policy aircon_admin_insert
on public.aircon_products
for insert
to authenticated
with check (public.is_admin());

create policy aircon_admin_update
on public.aircon_products
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy aircon_admin_delete
on public.aircon_products
for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('aircon-images', 'aircon-images', true)
on conflict (id) do update set public = true;

do $$
declare policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  loop
    execute format(
      'drop policy %I on storage.objects',
      policy_record.policyname
    );
  end loop;
end $$;

create policy aircon_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'aircon-images');

create policy aircon_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'aircon-images'
  and public.is_admin()
);

create policy aircon_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'aircon-images'
  and public.is_admin()
)
with check (
  bucket_id = 'aircon-images'
  and public.is_admin()
);

create policy aircon_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'aircon-images'
  and public.is_admin()
);

notify pgrst, 'reload schema';
