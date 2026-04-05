import { supabase } from '@/lib/supabase'

const RESPONSE_COLUMN_CANDIDATES = [
  { fieldKey: 'campo_id', valueKey: 'valor' },
  { fieldKey: 'campo_id', valueKey: 'resposta' },
  { fieldKey: 'anexo_campo_id', valueKey: 'valor' },
  { fieldKey: 'anexo_campo_id', valueKey: 'resposta' },
]

async function fetchResponseColumns(documentacaoId) {
  for (const candidate of RESPONSE_COLUMN_CANDIDATES) {
    const { error } = await supabase
      .from('anexo_respostas')
      .select(`id, ${candidate.fieldKey}, ${candidate.valueKey}`)
      .eq('documentacao_id', documentacaoId)
      .limit(1)

    if (!error) {
      return candidate
    }
  }

  return RESPONSE_COLUMN_CANDIDATES[0]
}

async function fetchDocumentacaoSystems(documentacaoId, documentacao) {
  try {
    const { data: vinculos, error: erroVinculos } = await supabase
      .from('documentacao_sistemas')
      .select('sistema_id')
      .eq('documentacao_id', documentacaoId)

    if (erroVinculos) {
      throw erroVinculos
    }

    const sistemaIds = (vinculos || []).map((item) => item.sistema_id)

    if (sistemaIds.length === 0) {
      return []
    }

    const { data: sistemasData, error: erroSistemas } = await supabase
      .from('sistemas')
      .select('id, nome')
      .in('id', sistemaIds)

    if (erroSistemas) {
      throw new Error(`Erro ao buscar sistemas da documentação: ${erroSistemas.message}`)
    }

    return sistemasData || []
  } catch (error) {
    if (!documentacao.sistema_id) {
      return []
    }

    const { data: sistemaData, error: erroSistema } = await supabase
      .from('sistemas')
      .select('id, nome')
      .eq('id', documentacao.sistema_id)
      .maybeSingle()

    if (erroSistema) {
      throw new Error(`Erro ao buscar sistema da documentação: ${erroSistema.message}`)
    }

    return sistemaData ? [sistemaData] : []
  }
}

function buildResponsesMap(rows, columns) {
  return new Map(
    (rows || []).map((row) => [
      row[columns.fieldKey],
      {
        id: row.id,
        value: row[columns.valueKey] ?? '',
      },
    ])
  )
}

export async function fetchDocumentacaoDetails(documentacaoId) {
  const { data: documentacao, error: erroDocs } = await supabase
    .from('documentacoes')
    .select('*')
    .eq('id', documentacaoId)
    .maybeSingle()

  if (erroDocs) {
    throw new Error(`Erro ao buscar documentação: ${erroDocs.message}`)
  }

  if (!documentacao) {
    throw new Error(`Documentação ${documentacaoId} não encontrada.`)
  }

  const [sistemas, responseColumns] = await Promise.all([
    fetchDocumentacaoSystems(documentacaoId, documentacao),
    fetchResponseColumns(documentacaoId),
  ])

  const [{ data: anexos, error: erroAnexos }, { data: respostas, error: erroRespostas }] =
    await Promise.all([
      supabase
        .from('anexos')
        .select('*')
        .eq('documentacao_id', documentacaoId)
        .order('ordem', { ascending: true }),
      supabase.from('anexo_respostas').select('*').eq('documentacao_id', documentacaoId),
    ])

  if (erroAnexos) {
    throw new Error(`Erro ao buscar anexos: ${erroAnexos.message}`)
  }

  if (erroRespostas) {
    throw new Error(`Erro ao buscar respostas da documentação: ${erroRespostas.message}`)
  }

  const respostasMap = buildResponsesMap(respostas, responseColumns)
  const anexosComEstrutura = []

  for (const anexo of anexos || []) {
    const { data: secoes, error: erroSecoes } = await supabase
      .from('anexo_secoes')
      .select('*')
      .eq('anexo_id', anexo.id)
      .order('ordem', { ascending: true })

    if (erroSecoes) {
      throw new Error(`Erro ao buscar seções do anexo ${anexo.id}: ${erroSecoes.message}`)
    }

    const secoesComCampos = []

    for (const secao of secoes || []) {
      const { data: campos, error: erroCampos } = await supabase
        .from('anexo_campos')
        .select('*')
        .eq('secao_id', secao.id)
        .order('ordem', { ascending: true })

      if (erroCampos) {
        throw new Error(`Erro ao buscar campos da seção ${secao.id}: ${erroCampos.message}`)
      }

      secoesComCampos.push({
        ...secao,
        campos: (campos || []).map((campo) => ({
          ...campo,
          resposta: respostasMap.get(campo.id)?.value ?? '',
        })),
      })
    }

    anexosComEstrutura.push({
      ...anexo,
      secoes: secoesComCampos,
    })
  }

  return {
    documentacao,
    sistemas,
    anexos: anexosComEstrutura,
  }
}

export async function createDocumentacaoSection({ anexoId, nome, ordem }) {
  const { data, error } = await supabase
    .from('anexo_secoes')
    .insert([
      {
        anexo_id: anexoId,
        nome,
        ordem,
        ativo: true,
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar seção: ${error.message}`)
  }

  return data
}

async function persistSingleResponse({
  documentacaoId,
  campoId,
  value,
  columns,
}) {
  const normalizedValue = value ?? ''
  const { data: existingRows, error: existingError } = await supabase
    .from('anexo_respostas')
    .select('id')
    .eq('documentacao_id', documentacaoId)
    .eq(columns.fieldKey, campoId)
    .order('id', { ascending: true })

  if (existingError) {
    throw new Error(`Erro ao buscar resposta do campo ${campoId}: ${existingError.message}`)
  }

  const rows = existingRows || []

  if (normalizedValue === '') {
    if (rows.length > 0) {
      const { error } = await supabase.from('anexo_respostas').delete().in(
        'id',
        rows.map((row) => row.id)
      )

      if (error) {
        throw new Error(`Erro ao limpar resposta do campo ${campoId}: ${error.message}`)
      }
    }

    return
  }

  if (rows.length === 0) {
    const { error } = await supabase.from('anexo_respostas').insert([
      {
        documentacao_id: documentacaoId,
        [columns.fieldKey]: campoId,
        [columns.valueKey]: normalizedValue,
      },
    ])

    if (error) {
      throw new Error(`Erro ao salvar resposta do campo ${campoId}: ${error.message}`)
    }

    return
  }

  const [primary, ...duplicates] = rows
  const { error: updateError } = await supabase
    .from('anexo_respostas')
    .update({
      [columns.valueKey]: normalizedValue,
    })
    .eq('id', primary.id)

  if (updateError) {
    throw new Error(`Erro ao atualizar resposta do campo ${campoId}: ${updateError.message}`)
  }

  if (duplicates.length > 0) {
    const { error: deleteError } = await supabase
      .from('anexo_respostas')
      .delete()
      .in(
        'id',
        duplicates.map((row) => row.id)
      )

    if (deleteError) {
      throw new Error(`Erro ao remover respostas duplicadas do campo ${campoId}: ${deleteError.message}`)
    }
  }
}

export async function saveDocumentacaoResponses({ documentacaoId, respostas }) {
  const columns = await fetchResponseColumns(documentacaoId)

  for (const resposta of respostas) {
    await persistSingleResponse({
      documentacaoId,
      campoId: resposta.campoId,
      value: resposta.value,
      columns,
    })
  }
}

export async function deleteDocumentacaoById(documentacaoId) {
  const { data, error } = await supabase
    .from('documentacoes')
    .delete()
    .eq('id', documentacaoId)
    .select('id')

  if (error) {
    throw new Error(`Erro ao excluir documentação ${documentacaoId}: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error(`A documentação ${documentacaoId} não pôde ser excluída.`)
  }

  return data[0]
}
