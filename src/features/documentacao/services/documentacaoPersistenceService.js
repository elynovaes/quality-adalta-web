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

async function listDocumentacaoAnexos(documentacaoId) {
  const { data, error } = await supabase
    .from('anexos')
    .select('id, nome, ordem, modelo_anexo_id')
    .eq('documentacao_id', documentacaoId)

  if (error) {
    throw new Error(`Erro ao consultar anexos da documentação ${documentacaoId}: ${error.message}`)
  }

  return data || []
}

async function createDocumentacaoAnexosFromModel(documentacaoId, attachments) {
  if (!attachments || attachments.length === 0) {
    return []
  }

  const currentAnexos = await listDocumentacaoAnexos(documentacaoId)

  if (currentAnexos.length > 0) {
    return currentAnexos
  }

  const payload = attachments.map((attachment, index) => ({
    documentacao_id: documentacaoId,
    nome: attachment.nome,
    descricao: attachment.descricao || null,
    ordem: attachment.ordem || index + 1,
    modelo_anexo_id: attachment.id || null,
  }))

  let { data, error } = await supabase.from('anexos').insert(payload).select('id, nome, ordem, modelo_anexo_id')

  if (error && /modelo_anexo_id/i.test(error.message || '')) {
    const fallbackPayload = payload.map(({ modelo_anexo_id, ...attachment }) => attachment)
    const fallback = await supabase.from('anexos').insert(fallbackPayload).select('id, nome, ordem')
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    throw new Error(`Erro ao criar anexos da documentação ${documentacaoId}: ${error.message}`)
  }

  return data || []
}

async function createDocumentacaoSectionsFromModel(documentacaoId, createdAnexos, attachments) {
  if (!createdAnexos?.length || !attachments?.length) {
    return []
  }

  const { data: existingSections, error: existingSectionsError } = await supabase
    .from('anexo_secoes')
    .select('id, anexo_id, nome, ordem')
    .in('anexo_id', createdAnexos.map((anexo) => anexo.id))

  if (existingSectionsError) {
    throw new Error(
      `Erro ao consultar seções existentes da documentação ${documentacaoId}: ${existingSectionsError.message}`
    )
  }

  if ((existingSections || []).length > 0) {
    return existingSections || []
  }

  const modelAttachmentIds = attachments.map((attachment) => attachment.id).filter(Boolean)

  if (modelAttachmentIds.length === 0) {
    return
  }

  const { data: modelSections, error: modelSectionsError } = await supabase
    .from('modelo_anexo_secoes')
    .select('id, nome, ordem, modelo_anexo_id, ativo')
    .in('modelo_anexo_id', modelAttachmentIds)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (modelSectionsError) {
    if (/does not exist|Could not find the table|relation .* does not exist/i.test(modelSectionsError.message || '')) {
      return
    }

    throw new Error(`Erro ao buscar seções do modelo para a documentação ${documentacaoId}: ${modelSectionsError.message}`)
  }

  const attachmentNameMap = new Map(attachments.map((attachment) => [attachment.id, attachment.nome]))
  const createdAnexoMap = new Map()

  for (const anexo of createdAnexos) {
    const matchingAttachment =
      attachments.find((attachment) => attachment.id && attachment.id === anexo.modelo_anexo_id) ||
      attachments.find((attachment) => attachment.nome === anexo.nome)

    if (matchingAttachment?.id) {
      createdAnexoMap.set(matchingAttachment.id, anexo.id)
    } else {
      const fallbackAttachmentId = [...attachmentNameMap.entries()].find(([, nome]) => nome === anexo.nome)?.[0]

      if (fallbackAttachmentId) {
        createdAnexoMap.set(fallbackAttachmentId, anexo.id)
      }
    }
  }

  const payload = (modelSections || [])
    .map((section) => {
      const anexoId = createdAnexoMap.get(section.modelo_anexo_id)

      if (!anexoId) {
        return null
      }

      return {
        anexo_id: anexoId,
        nome: section.nome,
        ordem: section.ordem || 0,
        ativo: true,
      }
    })
    .filter(Boolean)

  if (payload.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('anexo_secoes')
    .insert(payload)
    .select('id, anexo_id, nome, ordem')

  if (error) {
    throw new Error(`Erro ao criar seções dos anexos da documentação ${documentacaoId}: ${error.message}`)
  }

  return data || []
}

function stripOptionalCampoColumns(payload) {
  const fallback = { ...payload }
  delete fallback.label
  delete fallback.tipo
  delete fallback.opcoes
  delete fallback.ativo
  return fallback
}

async function createDocumentacaoFieldsFromModel(
  documentacaoId,
  createdAnexos,
  createdSections,
  attachments
) {
  if (!createdAnexos?.length || !createdSections?.length || !attachments?.length) {
    return
  }

  const modelAttachmentIds = attachments.map((attachment) => attachment.id).filter(Boolean)

  if (modelAttachmentIds.length === 0) {
    return
  }

  const { data: modelSections, error: modelSectionsError } = await supabase
    .from('modelo_anexo_secoes')
    .select('id, nome, ordem, modelo_anexo_id')
    .in('modelo_anexo_id', modelAttachmentIds)
    .eq('ativo', true)

  if (modelSectionsError) {
    if (/does not exist|Could not find the table|relation .* does not exist/i.test(modelSectionsError.message || '')) {
      return
    }

    throw new Error(`Erro ao buscar seções do modelo para campos da documentação ${documentacaoId}: ${modelSectionsError.message}`)
  }

  const sectionIds = (modelSections || []).map((section) => section.id)

  if (sectionIds.length === 0) {
    return
  }

  const { data: modelFields, error: modelFieldsError } = await supabase
    .from('modelo_anexo_campos')
    .select('id, nome, label, tipo, ordem, modelo_secao_id, opcoes')
    .in('modelo_secao_id', sectionIds)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (modelFieldsError) {
    if (/does not exist|Could not find the table|relation .* does not exist/i.test(modelFieldsError.message || '')) {
      return
    }

    throw new Error(`Erro ao buscar campos do modelo para a documentação ${documentacaoId}: ${modelFieldsError.message}`)
  }

  const { data: existingFields, error: existingFieldsError } = await supabase
    .from('anexo_campos')
    .select('id, secao_id')
    .in('secao_id', createdSections.map((section) => section.id))

  if (existingFieldsError) {
    throw new Error(
      `Erro ao consultar campos existentes da documentação ${documentacaoId}: ${existingFieldsError.message}`
    )
  }

  if ((existingFields || []).length > 0) {
    return
  }

  const createdAnexoMap = new Map()

  for (const anexo of createdAnexos) {
    const matchingAttachment =
      attachments.find((attachment) => attachment.id && attachment.id === anexo.modelo_anexo_id) ||
      attachments.find((attachment) => attachment.nome === anexo.nome)

    if (matchingAttachment?.id) {
      createdAnexoMap.set(matchingAttachment.id, anexo.id)
    }
  }

  const createdSectionMap = new Map()

  for (const createdSection of createdSections) {
    const matchingModelSection = (modelSections || []).find(
      (modelSection) =>
        createdAnexoMap.get(modelSection.modelo_anexo_id) === createdSection.anexo_id &&
        modelSection.nome === createdSection.nome &&
        Number(modelSection.ordem || 0) === Number(createdSection.ordem || 0)
    )

    if (matchingModelSection?.id) {
      createdSectionMap.set(matchingModelSection.id, createdSection.id)
    }
  }

  const payload = (modelFields || [])
    .map((field) => {
      const secaoId = createdSectionMap.get(field.modelo_secao_id)

      if (!secaoId) {
        return null
      }

      return {
        secao_id: secaoId,
        nome: field.nome,
        label: field.label || field.nome,
        tipo: field.tipo || 'text',
        opcoes: field.opcoes || '',
        ordem: field.ordem || 0,
        ativo: true,
      }
    })
    .filter(Boolean)

  if (payload.length === 0) {
    return
  }

  let { error } = await supabase.from('anexo_campos').insert(payload)

  if (error && /label|tipo|opcoes|ativo/i.test(error.message || '')) {
    const fallbackPayload = payload.map(stripOptionalCampoColumns)
    const fallback = await supabase.from('anexo_campos').insert(fallbackPayload)
    error = fallback.error
  }

  if (error) {
    throw new Error(`Erro ao criar campos dos anexos da documentação ${documentacaoId}: ${error.message}`)
  }
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
      const selectedAttachments = flowState.modeloAnexosSelecionados?.[document.qualificationTypeId] || []
      const createdAnexos = await createDocumentacaoAnexosFromModel(
        saved.id,
        selectedAttachments
      )
      const createdSections = await createDocumentacaoSectionsFromModel(
        saved.id,
        createdAnexos,
        selectedAttachments
      )
      await createDocumentacaoFieldsFromModel(
        saved.id,
        createdAnexos,
        createdSections,
        selectedAttachments
      )

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
