import { supabase } from '@/lib/supabase'
import { mapFlowToPersistenceModel } from '@/features/documentacao/mappers/documentacaoPersistenceMappers'
import { MODO_CRIACAO_DOCUMENTACAO } from '@/types/documentacao-flow'

function createDocumentKey({ modoCriacaoDocumentacao, tipo, sistemaIds }) {
  return `${modoCriacaoDocumentacao}:${tipo}:${[...sistemaIds].sort((a, b) => a - b).join(',')}`
}

async function listServiceSystems(serviceId) {
  const { data, error } = await supabase
    .from('sistemas')
    .select('id, nome, servico_id')
    .eq('servico_id', serviceId)
    .order('id', { ascending: true })

  if (error) {
    if (/row-level security policy/i.test(error.message || '')) {
      throw new Error(
        'Sem permissão para consultar sistemas no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
      )
    }

    throw new Error(`Erro ao consultar sistemas do serviço: ${error.message}`)
  }

  return data || []
}

async function syncServiceSystems(serviceId, systems) {
  const currentSystems = await listServiceSystems(serviceId)

  if (currentSystems.length < systems.length) {
    const missingSystems = systems.slice(currentSystems.length).map((system) => ({
      servico_id: serviceId,
      nome: system.nome,
    }))

    if (missingSystems.length > 0) {
      const { error } = await supabase.from('sistemas').insert(missingSystems)

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

  const updatedSystems = await listServiceSystems(serviceId)

  for (const [index, system] of systems.entries()) {
    const persisted = updatedSystems[index]

    if (!persisted || persisted.nome === system.nome) {
      continue
    }

    const { error } = await supabase
      .from('sistemas')
      .update({ nome: system.nome })
      .eq('id', persisted.id)

    if (error) {
      if (/row-level security policy/i.test(error.message || '')) {
        throw new Error(
          'Sem permissão para atualizar sistemas no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
        )
      }

      throw new Error(`Erro ao atualizar sistema ${persisted.id}: ${error.message}`)
    }
  }

  return await listServiceSystems(serviceId)
}

async function listExistingDocumentacoes(serviceId) {
  let documentacoes = []

  const { data, error } = await supabase
    .from('documentacoes')
    .select('id, sistema_id, tipo, modo_criacao_documentacao')
    .eq('servico_id', serviceId)
    .eq('categoria', 'Qualificação')

  if (error) {
    if (/row-level security policy/i.test(error.message || '')) {
      throw new Error(
        'Sem permissão para consultar documentações no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
      )
    }

    if (!/modo_criacao_documentacao/i.test(error.message || '')) {
      throw new Error(`Erro ao buscar documentações existentes: ${error.message}`)
    }

    const fallback = await supabase
      .from('documentacoes')
      .select('id, sistema_id, tipo')
      .eq('servico_id', serviceId)
      .eq('categoria', 'Qualificação')

    if (fallback.error) {
      throw new Error(`Erro ao buscar documentações existentes: ${fallback.error.message}`)
    }

    documentacoes = (fallback.data || []).map((item) => ({
      ...item,
      modo_criacao_documentacao: MODO_CRIACAO_DOCUMENTACAO.POR_SISTEMA,
    }))
  } else {
    documentacoes = data || []
  }

  const ids = documentacoes.map((item) => item.id)
  let bindings = []

  if (ids.length > 0) {
    const bindingResult = await supabase
      .from('documentacao_sistemas')
      .select('documentacao_id, sistema_id')
      .in('documentacao_id', ids)

    if (!bindingResult.error) {
      bindings = bindingResult.data || []
    }
  }

  return documentacoes.map((documentacao) => {
    const systemIds = bindings
      .filter((item) => item.documentacao_id === documentacao.id)
      .map((item) => item.sistema_id)

    return {
      ...documentacao,
      modoCriacaoDocumentacao:
        documentacao.modo_criacao_documentacao || MODO_CRIACAO_DOCUMENTACAO.POR_SISTEMA,
      systemIds:
        systemIds.length > 0
          ? systemIds
          : documentacao.sistema_id
            ? [documentacao.sistema_id]
            : [],
    }
  })
}

function stripOptionalColumns(payload) {
  const fallback = { ...payload }
  delete fallback.modo_criacao_documentacao
  delete fallback.cargo_elaborador
  delete fallback.cargo_revisor
  delete fallback.cargo_aprovador
  delete fallback.logo_cliente
  return fallback
}

async function saveDocumentacao(payload, existingId = null) {
  const action = existingId
    ? supabase.from('documentacoes').update(payload).eq('id', existingId)
    : supabase.from('documentacoes').insert([payload])

  let { data, error } = await action.select('*').single()

  if (error && /modo_criacao_documentacao|cargo_elaborador|cargo_revisor|cargo_aprovador|logo_cliente/i.test(error.message || '')) {
    const fallbackAction = existingId
      ? supabase.from('documentacoes').update(stripOptionalColumns(payload)).eq('id', existingId)
      : supabase.from('documentacoes').insert([stripOptionalColumns(payload)])

    const fallback = await fallbackAction.select('*').single()
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (/row-level security policy/i.test(error.message || '')) {
      throw new Error(
        existingId
          ? 'Sem permissão para atualizar documentações no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
          : 'Sem permissão para criar documentações no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
      )
    }

    throw new Error(
      existingId
        ? `Erro ao atualizar documentação ${existingId}: ${error.message}`
        : `Erro ao criar documentação: ${error.message}`
    )
  }

  return data
}

async function syncDocumentacaoSystems(documentacaoId, systemIds) {
  const deleteResult = await supabase
    .from('documentacao_sistemas')
    .delete()
    .eq('documentacao_id', documentacaoId)

  if (deleteResult.error) {
    if (/documentacao_sistemas/i.test(deleteResult.error.message || '')) {
      return false
    }

    if (/row-level security policy/i.test(deleteResult.error.message || '')) {
      throw new Error(
        'Sem permissão para atualizar vínculos entre documentação e sistemas no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
      )
    }

    throw new Error(
      `Erro ao limpar vínculos da documentação ${documentacaoId}: ${deleteResult.error.message}`
    )
  }

  if (systemIds.length === 0) {
    return true
  }

  const payload = systemIds.map((systemId, index) => ({
    documentacao_id: documentacaoId,
    sistema_id: systemId,
    principal: index === 0,
  }))

  const { error } = await supabase.from('documentacao_sistemas').insert(payload)

  if (error) {
    if (/row-level security policy/i.test(error.message || '')) {
      throw new Error(
        'Sem permissão para salvar vínculos entre documentação e sistemas no Supabase. Aplique a policy RLS do fluxo de documentação antes de continuar.'
      )
    }

    throw new Error(`Erro ao salvar vínculos da documentação ${documentacaoId}: ${error.message}`)
  }

  return true
}

export async function persistDocumentacaoFlow(flowState) {
  const persistenceModel = mapFlowToPersistenceModel(flowState)
  const persistedSystems = await syncServiceSystems(flowState.serviceId, flowState.sistemas)
  const systemsByLocalId = new Map(
    flowState.sistemas.map((system, index) => [
      system.localId,
      { ...system, persistedId: persistedSystems[index]?.id || null },
    ])
  )

  const existingDocumentacoes = await listExistingDocumentacoes(flowState.serviceId)
  const existingMap = new Map(
    existingDocumentacoes.map((item) => [
      createDocumentKey({
        modoCriacaoDocumentacao: item.modoCriacaoDocumentacao,
        tipo: item.tipo,
        sistemaIds: item.systemIds,
      }),
      item.id,
    ])
  )

  const savedDocumentacoes = []

  for (const group of persistenceModel) {
    const persistedGroupSystems = group.systems
      .map((system) => systemsByLocalId.get(system.localId))
      .filter(Boolean)
    const systemIds = persistedGroupSystems.map((system) => system.persistedId).filter(Boolean)
    const primarySystemId = systemIds[0] || null

    for (const document of group.documentsPayload) {
      const payload = {
        ...document.payload,
        sistema_id: primarySystemId,
      }

      const existingId = existingMap.get(
        createDocumentKey({
          modoCriacaoDocumentacao: payload.modo_criacao_documentacao,
          tipo: payload.tipo,
          sistemaIds: systemIds,
        })
      )

      const saved = await saveDocumentacao(payload, existingId)
      await syncDocumentacaoSystems(saved.id, systemIds)

      savedDocumentacoes.push({
        ...saved,
        systems: group.systems,
      })
    }
  }

  return {
    resumoCriacao: persistenceModel,
    documentacoes: savedDocumentacoes,
    documentacaoIds: savedDocumentacoes.map((item) => item.id),
  }
}
