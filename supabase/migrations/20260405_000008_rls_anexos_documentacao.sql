alter table public.anexos enable row level security;
alter table public.anexo_secoes enable row level security;
alter table public.anexo_campos enable row level security;
alter table public.anexo_respostas enable row level security;

drop policy if exists "authenticated read anexos" on public.anexos;
create policy "authenticated read anexos"
on public.anexos
for select
to authenticated
using (true);

drop policy if exists "authenticated insert anexos" on public.anexos;
create policy "authenticated insert anexos"
on public.anexos
for insert
to authenticated
with check (true);

drop policy if exists "authenticated update anexos" on public.anexos;
create policy "authenticated update anexos"
on public.anexos
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated delete anexos" on public.anexos;
create policy "authenticated delete anexos"
on public.anexos
for delete
to authenticated
using (true);

drop policy if exists "authenticated read anexo_secoes" on public.anexo_secoes;
create policy "authenticated read anexo_secoes"
on public.anexo_secoes
for select
to authenticated
using (true);

drop policy if exists "authenticated insert anexo_secoes" on public.anexo_secoes;
create policy "authenticated insert anexo_secoes"
on public.anexo_secoes
for insert
to authenticated
with check (true);

drop policy if exists "authenticated update anexo_secoes" on public.anexo_secoes;
create policy "authenticated update anexo_secoes"
on public.anexo_secoes
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated delete anexo_secoes" on public.anexo_secoes;
create policy "authenticated delete anexo_secoes"
on public.anexo_secoes
for delete
to authenticated
using (true);

drop policy if exists "authenticated read anexo_campos" on public.anexo_campos;
create policy "authenticated read anexo_campos"
on public.anexo_campos
for select
to authenticated
using (true);

drop policy if exists "authenticated insert anexo_campos" on public.anexo_campos;
create policy "authenticated insert anexo_campos"
on public.anexo_campos
for insert
to authenticated
with check (true);

drop policy if exists "authenticated update anexo_campos" on public.anexo_campos;
create policy "authenticated update anexo_campos"
on public.anexo_campos
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated delete anexo_campos" on public.anexo_campos;
create policy "authenticated delete anexo_campos"
on public.anexo_campos
for delete
to authenticated
using (true);

drop policy if exists "authenticated read anexo_respostas" on public.anexo_respostas;
create policy "authenticated read anexo_respostas"
on public.anexo_respostas
for select
to authenticated
using (true);

drop policy if exists "authenticated insert anexo_respostas" on public.anexo_respostas;
create policy "authenticated insert anexo_respostas"
on public.anexo_respostas
for insert
to authenticated
with check (true);

drop policy if exists "authenticated update anexo_respostas" on public.anexo_respostas;
create policy "authenticated update anexo_respostas"
on public.anexo_respostas
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated delete anexo_respostas" on public.anexo_respostas;
create policy "authenticated delete anexo_respostas"
on public.anexo_respostas
for delete
to authenticated
using (true);
