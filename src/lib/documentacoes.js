import { supabase } from './supabase'
import { gerarPlanoDocumentacoes } from './qualificacao'

function criarChaveDocumentacao({ modoCriacaoDocumentacao, tipo, sistemaIds }) {
  return `${modoCriacaoDocumentacao}:${tipo}:${[...sistemaIds].sort((a, b) => a - b).join(',')}`
}

async function listarSistemasServico(servicoId) {
  const { data, error } = await supabase
    .from('sistemas')
    .select('id, servico_id, nome, created_at, updated_at')
    .eq('servico_id', servicoId)
    .order('id', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar sistemas do serviço: ${error.message}`)
  }

  return data || []
}

async function sincronizarSistemasServico(servicoId, systems) {
  const sistemasExistentes = await listarSistemasServico(servicoId)

  if (sistemasExistentes.length < systems.length) {
    const sistemasFaltantes = systems.slice(sistemasExistentes.length).map((system) => ({
      servico_id: servicoId,
      nome: system.nome,
    }))

    if (sistemasFaltantes.length > 0) {
      const { error } = await supabase.from('sistemas').insert(sistemasFaltantes)

      if (error) {
        if (/row-level security policy/i.test(error.message || '')) {
          throw new Error(
            'Sem permissão para criar sistemas no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
          )
        }

        throw new Error(`Erro ao criar sistemas do serviço: ${error.message}`)
      }
    }
  }

  const sistemasPersistidos = await listarSistemasServico(servicoId)
  const sistemasVinculados = sistemasPersistidos.slice(0, systems.length)

  for (const [index, system] of systems.entries()) {
    const sistemaPersistido = sistemasVinculados[index]

    if (!sistemaPersistido || sistemaPersistido.nome === system.nome) {
      continue
    }

    const { error } = await supabase
      .from('sistemas')
      .update({
        nome: system.nome,
      })
      .eq('id', sistemaPersistido.id)

    if (error) {
      if (/row-level security policy/i.test(error.message || '')) {
        throw new Error(
          'Sem permissão para atualizar sistemas no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
        )
      }

      throw new Error(`Erro ao atualizar sistema ${sistemaPersistido.id}: ${error.message}`)
    }
  }

  return await listarSistemasServico(servicoId)
}

async function buscarDocumentacoesExistentes(servicoId) {
  const selectPadrao = 'id, sistema_id, tipo, modo_criacao_documentacao'
  let documentacoes = []

  const { data, error } = await supabase
    .from('documentacoes')
    .select(selectPadrao)
    .eq('servico_id', servicoId)
    .eq('categoria', 'Qualificação')

  if (error) {
    const colunaAusente = /modo_criacao_documentacao/i.test(error.message || '')

    if (!colunaAusente) {
      if (/row-level security policy/i.test(error.message || '')) {
        throw new Error(
          'Sem permissão para consultar documentações no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
        )
      }

      throw new Error(`Erro ao buscar documentações existentes: ${error.message}`)
    }

    const fallback = await supabase
      .from('documentacoes')
      .select('id, sistema_id, tipo')
      .eq('servico_id', servicoId)
      .eq('categoria', 'Qualificação')

    if (fallback.error) {
      throw new Error(`Erro ao buscar documentações existentes: ${fallback.error.message}`)
    }

    documentacoes = (fallback.data || []).map((item) => ({
      ...item,
      modo_criacao_documentacao: 'por_sistema',
    }))
  } else {
    documentacoes = data || []
  }

  const documentacaoIds = documentacoes.map((item) => item.id)
  let vinculacoes = []

  if (documentacaoIds.length > 0) {
    const { data: vinculacoesData, error: vinculacoesError } = await supabase
      .from('documentacao_sistemas')
      .select('documentacao_id, sistema_id, principal')
      .in('documentacao_id', documentacaoIds)

    if (!vinculacoesError) {
      vinculacoes = vinculacoesData || []
    }
  }

  return documentacoes.map((documentacao) => {
    const sistemaIds = vinculacoes
      .filter((item) => item.documentacao_id === documentacao.id)
      .map((item) => item.sistema_id)

    return {
      ...documentacao,
      sistemaIds: sistemaIds.length > 0 ? sistemaIds : documentacao.sistema_id ? [documentacao.sistema_id] : [],
      modoCriacaoDocumentacao: documentacao.modo_criacao_documentacao || 'por_sistema',
    }
  })
}

function criarPayloadBaseDocumentacao(servicoId, generalData, documentacao) {
  const payload = {
    servico_id: servicoId,
    categoria: 'Qualificação',
    tipo: documentacao.tipoBanco,
    titulo: documentacao.titulo,
    codigo: documentacao.codigo || null,
    nome_empresa: generalData.empresa?.nome || null,
    endereco_local: generalData.empresa?.endereco || null,
    cep: generalData.empresa?.cep || null,
    elaborador: generalData.elaborador?.nome || null,
    revisor: generalData.revisor?.nome || null,
    aprovador: generalData.aprovador?.nome || null,
    contato_aprovador: generalData.aprovador?.telefone || null,
    email_aprovador: generalData.aprovador?.email || null,
    area_profissional_aprovador: generalData.aprovador?.cargo || null,
  }

  if (generalData.elaborador?.cargo) {
    payload.cargo_elaborador = generalData.elaborador.cargo
  }

  if (generalData.revisor?.cargo) {
    payload.cargo_revisor = generalData.revisor.cargo
  }

  if (generalData.aprovador?.cargo) {
    payload.cargo_aprovador = generalData.aprovador.cargo
  }

  if (generalData.logoCliente) {
    payload.logo_cliente = generalData.logoCliente
  }

  return payload
}

async function salvarDocumentacao(payload, documentoExistenteId = null) {
  function removerCamposOpcionais(payloadAtual) {
    const payloadFallback = { ...payloadAtual }
    delete payloadFallback.modo_criacao_documentacao
    delete payloadFallback.cargo_elaborador
    delete payloadFallback.cargo_revisor
    delete payloadFallback.cargo_aprovador
    delete payloadFallback.logo_cliente
    return payloadFallback
  }

  if (documentoExistenteId) {
    let query = supabase
      .from('documentacoes')
      .update(payload)
      .eq('id', documentoExistenteId)
      .select('*')

    let { data, error } = await query.single()

    if (error && /modo_criacao_documentacao|cargo_elaborador|cargo_revisor|cargo_aprovador|logo_cliente/i.test(error.message || '')) {
      const payloadSemModo = removerCamposOpcionais(payload)

      const fallback = await supabase
        .from('documentacoes')
        .update(payloadSemModo)
        .eq('id', documentoExistenteId)
        .select('*')
        .single()

      data = fallback.data
      error = fallback.error
    }

    if (error) {
      if (/row-level security policy/i.test(error.message || '')) {
        throw new Error(
          'Sem permissão para atualizar documentações no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
        )
      }

      throw new Error(`Erro ao atualizar documentação ${documentoExistenteId}: ${error.message}`)
    }

    return data
  }

  let { data, error } = await supabase
    .from('documentacoes')
    .insert([payload])
    .select('*')
    .single()

  if (error && /modo_criacao_documentacao|cargo_elaborador|cargo_revisor|cargo_aprovador|logo_cliente/i.test(error.message || '')) {
    const payloadSemModo = removerCamposOpcionais(payload)

    const fallback = await supabase
      .from('documentacoes')
      .insert([payloadSemModo])
      .select('*')
      .single()

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (/row-level security policy/i.test(error.message || '')) {
      throw new Error(
        'Sem permissão para criar documentações no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
      )
    }

    throw new Error(`Erro ao criar documentação: ${error.message}`)
  }

  return data
}

async function sincronizarDocumentacaoSistemas(documentacaoId, sistemaIds) {
  const { error: deleteError } = await supabase
    .from('documentacao_sistemas')
    .delete()
    .eq('documentacao_id', documentacaoId)

  if (deleteError) {
    const tabelaAusente = /documentacao_sistemas/i.test(deleteError.message || '')

    if (!tabelaAusente) {
      if (/row-level security policy/i.test(deleteError.message || '')) {
        throw new Error(
          'Sem permissão para atualizar vínculos entre documentação e sistemas no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
        )
      }

      throw new Error(`Erro ao limpar vínculos da documentação ${documentacaoId}: ${deleteError.message}`)
    }

    return false
  }

  if (sistemaIds.length === 0) {
    return true
  }

  const payload = sistemaIds.map((sistemaId, index) => ({
    documentacao_id: documentacaoId,
    sistema_id: sistemaId,
    principal: index === 0,
  }))

  const { error: insertError } = await supabase.from('documentacao_sistemas').insert(payload)

  if (insertError) {
    if (/row-level security policy/i.test(insertError.message || '')) {
      throw new Error(
        'Sem permissão para salvar vínculos entre documentação e sistemas no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
      )
    }

    throw new Error(`Erro ao salvar vínculos da documentação ${documentacaoId}: ${insertError.message}`)
  }

  return true
}

export async function salvarPlanoDocumentacoesQualificacao({
  servicoId,
  generalData,
  modoCriacaoDocumentacao,
  systems,
  groupedDocuments,
}) {
  const plano = gerarPlanoDocumentacoes({
    modoCriacaoDocumentacao,
    systems,
    groupedDocuments,
  })

  const sistemasPersistidos = await sincronizarSistemasServico(servicoId, systems)
  const sistemasVinculados = systems.map((system, index) => ({
    ...system,
    sistemaId: sistemasPersistidos[index]?.id || null,
  }))

  const documentacoesExistentes = await buscarDocumentacoesExistentes(servicoId)
  const mapaExistentes = new Map(
    documentacoesExistentes.map((item) => [
      criarChaveDocumentacao({
        modoCriacaoDocumentacao: item.modoCriacaoDocumentacao,
        tipo: item.tipo,
        sistemaIds: item.sistemaIds,
      }),
      item.id,
    ])
  )

  const documentacoesSalvas = []

  for (const grupo of plano) {
    for (const documentacao of grupo.documentos) {
      const sistemasDoGrupo = grupo.systems
        .map((system) =>
          sistemasVinculados.find((item) => item.systemNumber === system.systemNumber)
        )
        .filter(Boolean)
      const sistemaIds = sistemasDoGrupo.map((item) => item.sistemaId).filter(Boolean)
      const sistemaPrincipalId = sistemaIds[0] || null
      const chaveExistente = criarChaveDocumentacao({
        modoCriacaoDocumentacao,
        tipo: documentacao.tipoBanco,
        sistemaIds,
      })
      const payloadBase = criarPayloadBaseDocumentacao(servicoId, generalData, documentacao)
      const payload = {
        ...payloadBase,
        sistema_id: sistemaPrincipalId,
        modo_criacao_documentacao: modoCriacaoDocumentacao,
      }

      const documentacaoSalva = await salvarDocumentacao(payload, mapaExistentes.get(chaveExistente))
      await sincronizarDocumentacaoSistemas(documentacaoSalva.id, sistemaIds)

      documentacoesSalvas.push({
        ...documentacaoSalva,
        systems: grupo.systems,
      })
    }
  }

  return {
    plano,
    systems: sistemasVinculados,
    documentacoes: documentacoesSalvas,
  }
}
