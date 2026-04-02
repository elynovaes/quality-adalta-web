insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos-clientes',
  'logos-clientes',
  true,
  2097152,
  array['image/png', 'image/jpeg']
)
on conflict (id) do nothing;

drop policy if exists "authenticated read logos-clientes" on storage.objects;
create policy "authenticated read logos-clientes"
on storage.objects
for select
to authenticated
using (bucket_id = 'logos-clientes');

drop policy if exists "authenticated insert logos-clientes" on storage.objects;
create policy "authenticated insert logos-clientes"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'logos-clientes');

drop policy if exists "authenticated update logos-clientes" on storage.objects;
create policy "authenticated update logos-clientes"
on storage.objects
for update
to authenticated
using (bucket_id = 'logos-clientes')
with check (bucket_id = 'logos-clientes');

drop policy if exists "authenticated delete logos-clientes" on storage.objects;
create policy "authenticated delete logos-clientes"
on storage.objects
for delete
to authenticated
using (bucket_id = 'logos-clientes');
