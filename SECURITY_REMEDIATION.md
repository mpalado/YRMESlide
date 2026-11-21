# YRME Supabase Security Remediation

Run `supabase-security-migration.sql` in the Supabase SQL Editor before enabling the admin console against production data.

## 1. Assign the admin role

After creating the Supabase authentication account, set its trusted app metadata:

```sql
update auth.users
set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb)
      || '{"role":"admin"}'::jsonb
where email = 'sample1@gmail.com';
```

Use the real administrator email instead of the placeholder.

## 2. Verify RLS

```sql
select relrowsecurity, relforcerowsecurity
from pg_class
where oid = 'public.aircon_products'::regclass;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'aircon_products';

select id, name, public
from storage.buckets
where id = 'aircon-images';
```

## 3. Verify anonymous access

- Public showroom reads should return only active, in-stock products.
- Anonymous inserts, updates, and deletes must be rejected.
- Public reads from `aircon-images` should work.
- Anonymous image uploads and deletes must be rejected.

Never add the Supabase `service_role` key to browser code, Vercel frontend variables, or this repository.
