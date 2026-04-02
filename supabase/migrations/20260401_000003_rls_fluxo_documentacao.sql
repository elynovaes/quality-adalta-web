alter table public.sistemas enable row level security;
alter table public.documentacoes enable row level security;
alter table public.documentacao_sistemas enable row level security;

drop policy if exists "authenticated read sistemas" on public.sistemas;
create policy "authenticated read sistemas"
on public.sistemas
for select
to authenticated
using (true);

drop policy if exists "authenticated insert sistemas" on public.sistemas;
create policy "authenticated insert sistemas"
on public.sistemas
for insert
to authenticated
with check (true);

drop policy if exists "authenticated update sistemas" on public.sistemas;
create policy "authenticated update sistemas"
on public.sistemas
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated read documentacoes" on public.documentacoes;
create policy "authenticated read documentacoes"
on public.documentacoes
for select
to authenticated
using (true);

drop policy if exists "authenticated insert documentacoes" on public.documentacoes;
create policy "authenticated insert documentacoes"
on public.documentacoes
for insert
to authenticated
with check (true);

drop policy if exists "authenticated update documentacoes" on public.documentacoes;
create policy "authenticated update documentacoes"
on public.documentacoes
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated delete documentacoes" on public.documentacoes;
create policy "authenticated delete documentacoes"
on public.documentacoes
for delete
to authenticated
using (true);

drop policy if exists "authenticated read documentacao_sistemas" on public.documentacao_sistemas;
create policy "authenticated read documentacao_sistemas"
on public.documentacao_sistemas
for select
to authenticated
using (true);

drop policy if exists "authenticated insert documentacao_sistemas" on public.documentacao_sistemas;
create policy "authenticated insert documentacao_sistemas"
on public.documentacao_sistemas
for insert
to authenticated
with check (true);

drop policy if exists "authenticated update documentacao_sistemas" on public.documentacao_sistemas;
create policy "authenticated update documentacao_sistemas"
on public.documentacao_sistemas
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated delete documentacao_sistemas" on public.documentacao_sistemas;
create policy "authenticated delete documentacao_sistemas"
on public.documentacao_sistemas
for delete
to authenticated
using (true);
