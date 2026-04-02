alter table public.documentacoes
  add column if not exists cargo_elaborador text,
  add column if not exists cargo_revisor text,
  add column if not exists cargo_aprovador text,
  add column if not exists logo_cliente text;
