create or replace function public.delete_documentacao_section_cascade(p_secao_id bigint)
returns void
language plpgsql
as $$
declare
  v_field_ids bigint[];
begin
  select coalesce(array_agg(id), '{}')
  into v_field_ids
  from public.anexo_campos
  where secao_id = p_secao_id;

  if array_length(v_field_ids, 1) is not null then
    delete from public.anexo_respostas where campo_id = any(v_field_ids);
    delete from public.anexo_campos where id = any(v_field_ids);
  end if;

  delete from public.anexo_secoes where id = p_secao_id;
end;
$$;

create or replace function public.delete_documentacao_attachment_cascade(p_anexo_id bigint)
returns void
language plpgsql
as $$
declare
  v_secao_ids bigint[];
  v_field_ids bigint[];
begin
  select coalesce(array_agg(id), '{}')
  into v_secao_ids
  from public.anexo_secoes
  where anexo_id = p_anexo_id;

  if array_length(v_secao_ids, 1) is not null then
    select coalesce(array_agg(id), '{}')
    into v_field_ids
    from public.anexo_campos
    where secao_id = any(v_secao_ids);

    if array_length(v_field_ids, 1) is not null then
      delete from public.anexo_respostas where campo_id = any(v_field_ids);
      delete from public.anexo_campos where id = any(v_field_ids);
    end if;

    delete from public.anexo_secoes where id = any(v_secao_ids);
  end if;

  delete from public.anexos where id = p_anexo_id;
end;
$$;

create or replace function public.clone_documentacao_base_attachments_as_equipment(p_documentacao_id bigint)
returns table(equipment_number integer, created_count integer)
language plpgsql
as $$
declare
  v_next_equipment_number integer;
  v_next_order integer;
  v_created_count integer := 0;
  v_new_anexo_id bigint;
  v_new_secao_id bigint;
  v_base_anexo record;
  v_secao record;
  v_campo record;
begin
  select coalesce(
    max(
      case
        when nome ~ '\s-\sEquipamento\s\d+$' then regexp_replace(nome, '^.*\s-\sEquipamento\s(\d+)$', '\1')::integer
        else 1
      end
    ),
    1
  ) + 1
  into v_next_equipment_number
  from public.anexos
  where documentacao_id = p_documentacao_id;

  select coalesce(max(ordem), 0)
  into v_next_order
  from public.anexos
  where documentacao_id = p_documentacao_id;

  for v_base_anexo in
    select id, nome, descricao, ordem
    from public.anexos
    where documentacao_id = p_documentacao_id
      and nome !~ '\s-\sEquipamento\s\d+$'
    order by ordem asc
  loop
    v_next_order := v_next_order + 1;

    insert into public.anexos (documentacao_id, nome, descricao, ordem)
    values (
      p_documentacao_id,
      regexp_replace(v_base_anexo.nome, '\s-\sEquipamento\s\d+$', '') || ' - Equipamento ' || v_next_equipment_number,
      v_base_anexo.descricao,
      v_next_order
    )
    returning id into v_new_anexo_id;

    v_created_count := v_created_count + 1;

    for v_secao in
      select id, nome, ordem
      from public.anexo_secoes
      where anexo_id = v_base_anexo.id
      order by ordem asc
    loop
      insert into public.anexo_secoes (anexo_id, nome, ordem, ativo)
      values (v_new_anexo_id, v_secao.nome, v_secao.ordem, true)
      returning id into v_new_secao_id;

      for v_campo in
        select nome, label, tipo, opcoes, ordem, ativo
        from public.anexo_campos
        where secao_id = v_secao.id
        order by ordem asc
      loop
        insert into public.anexo_campos (secao_id, nome, label, tipo, opcoes, ordem, ativo)
        values (
          v_new_secao_id,
          v_campo.nome,
          v_campo.label,
          v_campo.tipo,
          v_campo.opcoes,
          v_campo.ordem,
          coalesce(v_campo.ativo, true)
        );
      end loop;
    end loop;
  end loop;

  return query select v_next_equipment_number, v_created_count;
end;
$$;

create or replace function public.clone_model_attachments_to_documentacao(
  p_documentacao_id bigint,
  p_modalidade text default 'HVAC',
  p_attachment_names text[] default null,
  p_selected_sections jsonb default '{}'::jsonb
)
returns table(imported integer, skipped integer)
language plpgsql
as $$
declare
  v_documentacao record;
  v_qualification_type text;
  v_next_order integer;
  v_imported integer := 0;
  v_skipped integer := 0;
  v_attachment record;
  v_section record;
  v_field record;
  v_new_anexo_id bigint;
  v_new_secao_id bigint;
begin
  select id, categoria, tipo
  into v_documentacao
  from public.documentacoes
  where id = p_documentacao_id;

  if not found then
    raise exception 'Documentação % não encontrada.', p_documentacao_id;
  end if;

  if v_documentacao.categoria <> 'Qualificação' then
    raise exception 'A importação automática de anexos do modelo está disponível apenas para Qualificação.';
  end if;

  if upper(coalesce(v_documentacao.tipo, '')) like '%IQ%' then
    v_qualification_type := 'IQ';
  elsif upper(coalesce(v_documentacao.tipo, '')) like '%OQ%' then
    v_qualification_type := 'OQ';
  elsif upper(coalesce(v_documentacao.tipo, '')) like '%PQ%' then
    v_qualification_type := 'PQ';
  else
    raise exception 'Não foi possível identificar IQ, OQ ou PQ a partir do tipo da documentação.';
  end if;

  select coalesce(max(ordem), 0)
  into v_next_order
  from public.anexos
  where documentacao_id = p_documentacao_id;

  for v_attachment in
    select ma.id, ma.nome, ma.descricao, ma.ordem
    from public.modelo_anexos ma
    join public.modelo_qualificacao_tipos mqt on mqt.id = ma.qualificacao_tipo_id
    join public.modelo_qualificacao_modalidades mqm on mqm.id = mqt.modalidade_id
    where mqm.nome = p_modalidade
      and mqt.nome = v_qualification_type
      and ma.ativo = true
    order by ma.ordem asc
  loop
    if p_attachment_names is not null and not (v_attachment.nome = any(p_attachment_names)) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if exists (
      select 1
      from public.anexos
      where documentacao_id = p_documentacao_id
        and nome = v_attachment.nome
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_next_order := v_next_order + 1;

    insert into public.anexos (documentacao_id, nome, descricao, ordem)
    values (p_documentacao_id, v_attachment.nome, v_attachment.descricao, v_next_order)
    returning id into v_new_anexo_id;

    v_imported := v_imported + 1;

    for v_section in
      select id, nome, ordem
      from public.modelo_anexo_secoes
      where modelo_anexo_id = v_attachment.id
        and ativo = true
      order by ordem asc
    loop
      if jsonb_typeof(p_selected_sections -> v_attachment.nome) = 'array'
         and jsonb_array_length(p_selected_sections -> v_attachment.nome) > 0
         and not exists (
           select 1
           from jsonb_array_elements_text(p_selected_sections -> v_attachment.nome) as selected(nome)
           where selected.nome = v_section.nome
         ) then
        continue;
      end if;

      insert into public.anexo_secoes (anexo_id, nome, ordem, ativo)
      values (v_new_anexo_id, v_section.nome, v_section.ordem, true)
      returning id into v_new_secao_id;

      for v_field in
        select nome, label, tipo, opcoes, ordem, ativo
        from public.modelo_anexo_campos
        where modelo_secao_id = v_section.id
          and ativo = true
        order by ordem asc
      loop
        insert into public.anexo_campos (secao_id, nome, label, tipo, opcoes, ordem, ativo)
        values (
          v_new_secao_id,
          v_field.nome,
          v_field.label,
          v_field.tipo,
          v_field.opcoes,
          v_field.ordem,
          coalesce(v_field.ativo, true)
        );
      end loop;
    end loop;
  end loop;

  return query select v_imported, v_skipped;
end;
$$;

grant execute on function public.delete_documentacao_section_cascade(bigint) to authenticated;
grant execute on function public.delete_documentacao_attachment_cascade(bigint) to authenticated;
grant execute on function public.clone_documentacao_base_attachments_as_equipment(bigint) to authenticated;
grant execute on function public.clone_model_attachments_to_documentacao(bigint, text, text[], jsonb) to authenticated;
