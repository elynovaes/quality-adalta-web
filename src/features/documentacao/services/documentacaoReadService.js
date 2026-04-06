import { supabase } from '@/lib/supabase'
import { fetchAttachmentsForQualification } from '@/features/documentacao/services/documentacaoModelService'
import {
  AIRFLOW_ACCEPTANCE_SUFFIX,
  AIRFLOW_BLOCK_LABELS,
  AIRFLOW_CONFIGURATION_FIELD,
  AIRFLOW_DEVIATION_COMMENT_SUFFIX,
  AIRFLOW_MATRIX_STORAGE_SUFFIX,
  AIRFLOW_MEASURED_FLOW_SUFFIX,
  AIRFLOW_METHOD_SUFFIX,
  AIRFLOW_OUTLET_SUM_SUFFIX,
  AIRFLOW_PERCENTAGE_SUFFIX,
  AIRFLOW_SEGMENT_COUNT_SUFFIX,
  AIRFLOW_SEGMENT_NOMINALS_SUFFIX,
  AIRFLOW_SEGMENTS_DATA_SUFFIX,
  buildMissingAirflowSupportFields,
  isAirflowSectionName,
  mergeAirflowSupportFields,
} from '@/features/documentacao/utils/airflowSupportFields'

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

function isMissingRpcFunctionError(error) {
  return /function .* does not exist|Could not find the function|not find the function|42883/i.test(
    error?.message || ''
  )
}

function isMissingColumnError(error, columnName) {
  return new RegExp(`column .*${columnName}.* does not exist`, 'i').test(error?.message || '')
}

async function fetchSectionFields(secaoId) {
  let { data, error } = await supabase
    .from('anexo_campos')
    .select('id, nome, label, tipo, ordem, opcoes, ativo, secao_id')
    .eq('secao_id', secaoId)
    .order('ordem', { ascending: true })

  if (error && isMissingColumnError(error, 'opcoes')) {
    const fallback = await supabase
      .from('anexo_campos')
      .select('id, nome, label, tipo, ordem, ativo, secao_id')
      .eq('secao_id', secaoId)
      .order('ordem', { ascending: true })

    data = (fallback.data || []).map((field) => ({ ...field, opcoes: '' }))
    error = fallback.error
  }

  return {
    data: data || [],
    error,
  }
}

export async function ensureDocumentacaoSectionSupportFields(secaoId, secaoNome, campos = []) {
  const missingPayload = buildMissingAirflowSupportFields(secaoId, secaoNome, campos)

  if (!missingPayload.length) {
    return campos
  }

  let { data, error } = await supabase
    .from('anexo_campos')
    .insert(missingPayload)
    .select('*')

  if (error && /label|tipo|opcoes|ativo/i.test(error.message || '')) {
    const fallback = await supabase
      .from('anexo_campos')
      .insert(missingPayload.map(stripOptionalCampoColumns))
      .select('*')
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    throw new Error(`Erro ao sincronizar campos internos de Vazão de Ar: ${error.message}`)
  }

  return [...campos, ...(data || [])].sort((left, right) => Number(left.ordem || 0) - Number(right.ordem || 0))
}

export async function syncDocumentacaoSupportFields(documentacaoId) {
  const { data: anexos, error: anexosError } = await supabase
    .from('anexos')
    .select('id')
    .eq('documentacao_id', documentacaoId)

  if (anexosError) {
    throw new Error(`Erro ao buscar anexos para sincronização: ${anexosError.message}`)
  }

  for (const anexo of anexos || []) {
    const { data: secoes, error: secoesError } = await supabase
      .from('anexo_secoes')
      .select('id, nome')
      .eq('anexo_id', anexo.id)

    if (secoesError) {
      throw new Error(`Erro ao buscar seções para sincronização: ${secoesError.message}`)
    }

    for (const secao of secoes || []) {
      if (!isAirflowSectionName(secao.nome)) {
        continue
      }

      const { data: campos, error: camposError } = await fetchSectionFields(secao.id)

      if (camposError) {
        throw new Error(`Erro ao buscar campos da seção ${secao.id}: ${camposError.message}`)
      }

      await ensureDocumentacaoSectionSupportFields(secao.id, secao.nome, campos || [])
    }
  }
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
      const { data: campos, error: erroCampos } = await fetchSectionFields(secao.id)

      if (erroCampos) {
        throw new Error(`Erro ao buscar campos da seção ${secao.id}: ${erroCampos.message}`)
      }

      const camposComMatriz = mergeAirflowSupportFields(secao.id, secao.nome, campos || [])

      secoesComCampos.push({
        ...secao,
        campos: (camposComMatriz || []).map((campo) => ({
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

async function resolveCompatibleModelSections({ anexoId, modalidade = 'HVAC' }) {
  const { data: anexo, error: anexoError } = await supabase
    .from('anexos')
    .select('id, nome, documentacao_id')
    .eq('id', anexoId)
    .single()

  if (anexoError) {
    throw new Error(`Erro ao buscar anexo ${anexoId}: ${anexoError.message}`)
  }

  const { data: documentacao, error: documentacaoError } = await supabase
    .from('documentacoes')
    .select('id, categoria, tipo')
    .eq('id', anexo.documentacao_id)
    .single()

  if (documentacaoError) {
    throw new Error(`Erro ao buscar documentação do anexo ${anexoId}: ${documentacaoError.message}`)
  }

  if (documentacao.categoria !== 'Qualificação') {
    throw new Error('A importação de seções do modelo está disponível apenas para Qualificação.')
  }

  const qualificationType = inferQualificationTypeFromDocumentType(documentacao.tipo)

  if (!qualificationType) {
    throw new Error('Não foi possível identificar IQ, OQ ou PQ a partir do tipo da documentação.')
  }

  const modelAttachments = await fetchAttachmentsForQualification({
    modalidade,
    qualificationType,
  })

  const baseAttachmentName = getBaseAttachmentName(anexo.nome)
  const matchingModelAttachment = modelAttachments.find(
    (attachment) => getBaseAttachmentName(attachment.nome) === baseAttachmentName
  )

  if (!matchingModelAttachment?.id) {
    throw new Error(`Nenhum anexo de modelo compatível foi encontrado para "${anexo.nome}".`)
  }

  const [currentSectionsResult, modelSectionsResult] = await Promise.all([
    supabase
      .from('anexo_secoes')
      .select('id, nome, ordem')
      .eq('anexo_id', anexoId)
      .order('ordem', { ascending: true }),
    supabase
      .from('modelo_anexo_secoes')
      .select('id, nome, ordem')
      .eq('modelo_anexo_id', matchingModelAttachment.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true }),
  ])

  if (currentSectionsResult.error) {
    throw new Error(`Erro ao buscar seções atuais do anexo ${anexoId}: ${currentSectionsResult.error.message}`)
  }

  if (modelSectionsResult.error) {
    throw new Error(`Erro ao buscar seções do modelo do anexo ${anexoId}: ${modelSectionsResult.error.message}`)
  }

  const currentNames = new Set((currentSectionsResult.data || []).map((section) => section.nome))

  return {
    anexo,
    documentacao,
    modelAttachment: matchingModelAttachment,
    sections: (modelSectionsResult.data || []).map((section) => ({
      ...section,
      alreadyImported: currentNames.has(section.nome),
    })),
  }
}

export async function fetchCompatibleModelSectionsForAttachment({
  anexoId,
  modalidade = 'HVAC',
}) {
  const compatible = await resolveCompatibleModelSections({
    anexoId,
    modalidade,
  })

  return compatible.sections
}

export async function importModelSectionsToAttachment({
  anexoId,
  modalidade = 'HVAC',
  sectionNames = [],
}) {
  const compatible = await resolveCompatibleModelSections({
    anexoId,
    modalidade,
  })

  if (!compatible.sections.length) {
    return { imported: 0, skipped: 0 }
  }

  const selectedNameSet = new Set(sectionNames)
  const pendingSections = compatible.sections.filter(
    (section) => !section.alreadyImported && selectedNameSet.has(section.nome)
  )

  if (!pendingSections.length) {
    return { imported: 0, skipped: compatible.sections.length }
  }

  const { data: createdSections, error: createSectionsError } = await supabase
    .from('anexo_secoes')
    .insert(
      pendingSections.map((section) => ({
        anexo_id: anexoId,
        nome: section.nome,
        ordem: section.ordem || 0,
        ativo: true,
      }))
    )
    .select('id, nome, ordem')

  if (createSectionsError) {
    throw new Error(`Erro ao importar seções do modelo: ${createSectionsError.message}`)
  }

  const modelSectionIds = pendingSections.map((section) => section.id)
  const { data: modelFields, error: modelFieldsError } = await supabase
    .from('modelo_anexo_campos')
    .select('id, nome, label, tipo, ordem, modelo_secao_id, opcoes')
    .in('modelo_secao_id', modelSectionIds)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (modelFieldsError && !/does not exist|Could not find the table|relation .* does not exist/i.test(modelFieldsError.message || '')) {
    throw new Error(`Erro ao buscar campos das seções do modelo: ${modelFieldsError.message}`)
  }

  const createdSectionMap = new Map()

  for (const createdSection of createdSections || []) {
    const matchingModelSection = pendingSections.find(
      (section) =>
        section.nome === createdSection.nome &&
        Number(section.ordem || 0) === Number(createdSection.ordem || 0)
    )

    if (matchingModelSection?.id) {
      createdSectionMap.set(matchingModelSection.id, createdSection.id)
    }
  }

  const fieldPayload = (modelFields || [])
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

  if (fieldPayload.length > 0) {
    let { error: createFieldsError } = await supabase.from('anexo_campos').insert(fieldPayload)

    if (createFieldsError && /label|tipo|opcoes|ativo/i.test(createFieldsError.message || '')) {
      const fallback = await supabase
        .from('anexo_campos')
        .insert(fieldPayload.map(stripOptionalCampoColumns))
      createFieldsError = fallback.error
    }

    if (createFieldsError) {
      throw new Error(`Erro ao importar campos das seções do modelo: ${createFieldsError.message}`)
    }
  }

  return {
    imported: createdSections?.length || 0,
    skipped: compatible.sections.length - (createdSections?.length || 0),
  }
}

export async function deleteDocumentacaoSection(secaoId) {
  const rpcAttempt = await supabase.rpc('delete_documentacao_section_cascade', {
    p_secao_id: secaoId,
  })

  if (!rpcAttempt.error) {
    return
  }

  if (!isMissingRpcFunctionError(rpcAttempt.error)) {
    throw new Error(`Erro ao excluir seção ${secaoId}: ${rpcAttempt.error.message}`)
  }

  const { data: fields, error: fieldsError } = await supabase
    .from('anexo_campos')
    .select('id')
    .eq('secao_id', secaoId)

  if (fieldsError) {
    throw new Error(`Erro ao buscar campos da seção ${secaoId}: ${fieldsError.message}`)
  }

  const fieldIds = (fields || []).map((field) => field.id)

  if (fieldIds.length > 0) {
    const respostaCandidates = ['campo_id', 'anexo_campo_id']

    for (const candidate of respostaCandidates) {
      const attempt = await supabase.from('anexo_respostas').delete().in(candidate, fieldIds)

      if (!attempt.error) {
        break
      }

      if (!/column .* does not exist|Could not find the column/i.test(attempt.error.message || '')) {
        throw new Error(`Erro ao excluir respostas da seção ${secaoId}: ${attempt.error.message}`)
      }
    }

    const { error: deleteFieldsError } = await supabase.from('anexo_campos').delete().in('id', fieldIds)

    if (deleteFieldsError) {
      throw new Error(`Erro ao excluir campos da seção ${secaoId}: ${deleteFieldsError.message}`)
    }
  }

  const { error: deleteSectionError } = await supabase.from('anexo_secoes').delete().eq('id', secaoId)

  if (deleteSectionError) {
    throw new Error(`Erro ao excluir seção ${secaoId}: ${deleteSectionError.message}`)
  }
}

export async function createDocumentacaoAttachment({ documentacaoId, nome, descricao = '', ordem }) {
  const { data, error } = await supabase
    .from('anexos')
    .insert([
      {
        documentacao_id: documentacaoId,
        nome,
        descricao: descricao || null,
        ordem,
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar anexo: ${error.message}`)
  }

  return data
}

function inferQualificationTypeFromDocumentType(tipo) {
  const normalized = String(tipo || '').toUpperCase()

  if (normalized.includes('IQ')) {
    return 'IQ'
  }

  if (normalized.includes('OQ')) {
    return 'OQ'
  }

  if (normalized.includes('PQ')) {
    return 'PQ'
  }

  return null
}

async function resolveCompatibleModelAttachments({ documentacaoId, modalidade = 'HVAC' }) {
  const { data: documentacao, error: documentacaoError } = await supabase
    .from('documentacoes')
    .select('id, categoria, tipo')
    .eq('id', documentacaoId)
    .single()

  if (documentacaoError) {
    throw new Error(`Erro ao buscar documentação para importar anexos: ${documentacaoError.message}`)
  }

  if (documentacao.categoria !== 'Qualificação') {
    throw new Error('A importação automática de anexos do modelo está disponível apenas para Qualificação.')
  }

  const qualificationType = inferQualificationTypeFromDocumentType(documentacao.tipo)

  if (!qualificationType) {
    throw new Error('Não foi possível identificar IQ, OQ ou PQ a partir do tipo da documentação.')
  }

  const [modelAttachments, currentAttachmentsResult] = await Promise.all([
    fetchAttachmentsForQualification({
      modalidade,
      qualificationType,
    }),
    supabase
      .from('anexos')
      .select('id, nome, ordem')
      .eq('documentacao_id', documentacaoId)
      .order('ordem', { ascending: true }),
  ])

  if (currentAttachmentsResult.error) {
    throw new Error(
      `Erro ao buscar anexos atuais da documentação: ${currentAttachmentsResult.error.message}`
    )
  }

  const currentAttachments = currentAttachmentsResult.data || []
  const existingNames = new Set(currentAttachments.map((attachment) => attachment.nome))
  const modelAttachmentIds = modelAttachments.map((attachment) => attachment.id).filter(Boolean)
  let sectionsByAttachmentId = {}

  if (modelAttachmentIds.length > 0) {
    const { data: modelSections, error: modelSectionsError } = await supabase
      .from('modelo_anexo_secoes')
      .select('id, nome, ordem, modelo_anexo_id')
      .in('modelo_anexo_id', modelAttachmentIds)
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (modelSectionsError && !/does not exist|Could not find the table|relation .* does not exist/i.test(modelSectionsError.message || '')) {
      throw new Error(`Erro ao buscar seções dos anexos do modelo: ${modelSectionsError.message}`)
    }

    sectionsByAttachmentId = (modelSections || []).reduce((acc, section) => {
      if (!acc[section.modelo_anexo_id]) {
        acc[section.modelo_anexo_id] = []
      }

      acc[section.modelo_anexo_id].push({
        id: section.id,
        nome: section.nome,
        ordem: section.ordem || 0,
      })
      return acc
    }, {})
  }

  return {
    qualificationType,
    modalidade,
    documentacao,
    currentAttachments,
    attachments: modelAttachments.map((attachment) => ({
      ...attachment,
      alreadyImported: existingNames.has(attachment.nome),
      sections: sectionsByAttachmentId[attachment.id] || [],
    })),
  }
}

async function insertDocumentacaoAttachments(documentacaoId, attachments, initialOrder = 0) {
  if (!attachments.length) {
    return []
  }

  const payload = attachments.map((attachment, index) => ({
    documentacao_id: documentacaoId,
    nome: attachment.nome,
    descricao: attachment.descricao || null,
    ordem: initialOrder + index + 1,
    modelo_anexo_id: attachment.id || null,
  }))

  let { data, error } = await supabase
    .from('anexos')
    .insert(payload)
    .select('id, nome, ordem, modelo_anexo_id')

  if (error && /modelo_anexo_id/i.test(error.message || '')) {
    const fallbackPayload = payload.map(({ modelo_anexo_id, ...attachment }) => attachment)
    const fallback = await supabase.from('anexos').insert(fallbackPayload).select('id, nome, ordem')
    data = (fallback.data || []).map((anexo) => ({ ...anexo, modelo_anexo_id: null }))
    error = fallback.error
  }

  if (error) {
    throw new Error(`Erro ao criar anexos da documentação ${documentacaoId}: ${error.message}`)
  }

  return data || []
}

async function insertDocumentacaoSectionsFromModel(createdAnexos, attachments, selectedSectionsByAttachmentName = {}) {
  const modelAttachmentIds = attachments.map((attachment) => attachment.id).filter(Boolean)

  if (!modelAttachmentIds.length || !createdAnexos.length) {
    return []
  }

  const { data: modelSections, error } = await supabase
    .from('modelo_anexo_secoes')
    .select('id, nome, ordem, modelo_anexo_id')
    .in('modelo_anexo_id', modelAttachmentIds)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (error) {
    if (/does not exist|Could not find the table|relation .* does not exist/i.test(error.message || '')) {
      return []
    }

    throw new Error(`Erro ao buscar seções do modelo: ${error.message}`)
  }

  const anexoIdByModelAttachmentId = new Map()

  for (const anexo of createdAnexos) {
    const matchingAttachment =
      attachments.find((attachment) => attachment.id && attachment.id === anexo.modelo_anexo_id) ||
      attachments.find((attachment) => attachment.nome === anexo.nome)

    if (matchingAttachment?.id) {
      anexoIdByModelAttachmentId.set(matchingAttachment.id, anexo.id)
    }
  }

  const payload = (modelSections || [])
    .map((section) => {
      const matchingAttachment = attachments.find((attachment) => attachment.id === section.modelo_anexo_id)
      const selectedSectionNames = selectedSectionsByAttachmentName[matchingAttachment?.nome || '']

      if (Array.isArray(selectedSectionNames) && selectedSectionNames.length > 0) {
        if (!selectedSectionNames.includes(section.nome)) {
          return null
        }
      }

      const anexoId = anexoIdByModelAttachmentId.get(section.modelo_anexo_id)

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

  if (!payload.length) {
    return []
  }

  const { data, error: insertError } = await supabase
    .from('anexo_secoes')
    .insert(payload)
    .select('id, anexo_id, nome, ordem')

  if (insertError) {
    throw new Error(`Erro ao criar seções dos anexos importados: ${insertError.message}`)
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

async function insertDocumentacaoFieldsFromModel(
  createdAnexos,
  createdSections,
  attachments,
  selectedSectionsByAttachmentName = {}
) {
  if (!createdAnexos.length || !createdSections.length) {
    return
  }

  const modelAttachmentIds = attachments.map((attachment) => attachment.id).filter(Boolean)

  if (!modelAttachmentIds.length) {
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

    throw new Error(`Erro ao buscar seções do modelo para campos: ${modelSectionsError.message}`)
  }

  const sectionIds = (modelSections || []).map((section) => section.id)

  if (!sectionIds.length) {
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

    throw new Error(`Erro ao buscar campos do modelo: ${modelFieldsError.message}`)
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
      const matchingModelSection = (modelSections || []).find((section) => section.id === field.modelo_secao_id)
      const matchingAttachment = attachments.find(
        (attachment) => attachment.id === matchingModelSection?.modelo_anexo_id
      )
      const selectedSectionNames = selectedSectionsByAttachmentName[matchingAttachment?.nome || '']

      if (Array.isArray(selectedSectionNames) && selectedSectionNames.length > 0) {
        if (!selectedSectionNames.includes(matchingModelSection?.nome)) {
          return null
        }
      }

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

  if (!payload.length) {
    return
  }

  let { error } = await supabase.from('anexo_campos').insert(payload)

  if (error && /label|tipo|opcoes|ativo/i.test(error.message || '')) {
    const fallback = await supabase
      .from('anexo_campos')
      .insert(payload.map(stripOptionalCampoColumns))
    error = fallback.error
  }

  if (error) {
    throw new Error(`Erro ao criar campos dos anexos importados: ${error.message}`)
  }
}

export async function importModelAttachmentsToDocumentacao({
  documentacaoId,
  modalidade = 'HVAC',
  attachmentNames = null,
  selectedSectionsByAttachmentName = {},
}) {
  const rpcAttempt = await supabase.rpc('clone_model_attachments_to_documentacao', {
    p_documentacao_id: documentacaoId,
    p_modalidade: modalidade,
    p_attachment_names: Array.isArray(attachmentNames) && attachmentNames.length > 0 ? attachmentNames : null,
    p_selected_sections: selectedSectionsByAttachmentName,
  })

  if (!rpcAttempt.error) {
    const rpcRow = Array.isArray(rpcAttempt.data) ? rpcAttempt.data[0] : rpcAttempt.data
    return {
      imported: Number(rpcRow?.imported || 0),
      skipped: Number(rpcRow?.skipped || 0),
    }
  }

  if (!isMissingRpcFunctionError(rpcAttempt.error)) {
    throw new Error(`Erro ao importar anexos do modelo: ${rpcAttempt.error.message}`)
  }

  const compatible = await resolveCompatibleModelAttachments({
    documentacaoId,
    modalidade,
  })

  if (!compatible.attachments.length) {
    return { imported: 0, skipped: 0 }
  }

  const selectedNameSet =
    Array.isArray(attachmentNames) && attachmentNames.length > 0
      ? new Set(attachmentNames)
      : null
  const pendingAttachments = compatible.attachments.filter(
    (attachment) =>
      !attachment.alreadyImported && (!selectedNameSet || selectedNameSet.has(attachment.nome))
  )

  if (!pendingAttachments.length) {
    return { imported: 0, skipped: compatible.attachments.length }
  }

  const createdAnexos = await insertDocumentacaoAttachments(
    documentacaoId,
    pendingAttachments,
    compatible.currentAttachments?.length || 0
  )
  const createdSections = await insertDocumentacaoSectionsFromModel(
    createdAnexos,
    pendingAttachments,
    selectedSectionsByAttachmentName
  )
  await insertDocumentacaoFieldsFromModel(
    createdAnexos,
    createdSections,
    pendingAttachments,
    selectedSectionsByAttachmentName
  )

  return {
    imported: createdAnexos.length,
    skipped: compatible.attachments.length - createdAnexos.length,
  }
}

export async function fetchCompatibleModelAttachmentsForDocumentacao({
  documentacaoId,
  modalidade = 'HVAC',
}) {
  const compatible = await resolveCompatibleModelAttachments({
    documentacaoId,
    modalidade,
  })

  return compatible.attachments
}

export async function deleteDocumentacaoAttachment(anexoId) {
  const rpcAttempt = await supabase.rpc('delete_documentacao_attachment_cascade', {
    p_anexo_id: anexoId,
  })

  if (!rpcAttempt.error) {
    return
  }

  if (!isMissingRpcFunctionError(rpcAttempt.error)) {
    throw new Error(`Erro ao excluir anexo ${anexoId}: ${rpcAttempt.error.message}`)
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('anexo_secoes')
    .select('id')
    .eq('anexo_id', anexoId)

  if (sectionsError) {
    throw new Error(`Erro ao buscar seções do anexo ${anexoId}: ${sectionsError.message}`)
  }

  const sectionIds = (sections || []).map((section) => section.id)
  let fieldIds = []

  if (sectionIds.length > 0) {
    const { data: fields, error: fieldsError } = await supabase
      .from('anexo_campos')
      .select('id')
      .in('secao_id', sectionIds)

    if (fieldsError) {
      throw new Error(`Erro ao buscar campos do anexo ${anexoId}: ${fieldsError.message}`)
    }

    fieldIds = (fields || []).map((field) => field.id)
  }

  if (fieldIds.length > 0) {
    const respostaCandidates = ['campo_id', 'anexo_campo_id']

    for (const candidate of respostaCandidates) {
      const attempt = await supabase.from('anexo_respostas').delete().in(candidate, fieldIds)

      if (!attempt.error) {
        break
      }

      if (!/column .* does not exist|Could not find the column/i.test(attempt.error.message || '')) {
        throw new Error(`Erro ao excluir respostas do anexo ${anexoId}: ${attempt.error.message}`)
      }
    }

    const { error: deleteFieldsError } = await supabase.from('anexo_campos').delete().in('id', fieldIds)

    if (deleteFieldsError) {
      throw new Error(`Erro ao excluir campos do anexo ${anexoId}: ${deleteFieldsError.message}`)
    }
  }

  if (sectionIds.length > 0) {
    const { error: deleteSectionsError } = await supabase.from('anexo_secoes').delete().in('id', sectionIds)

    if (deleteSectionsError) {
      throw new Error(`Erro ao excluir seções do anexo ${anexoId}: ${deleteSectionsError.message}`)
    }
  }

  const { error: deleteAttachmentError } = await supabase.from('anexos').delete().eq('id', anexoId)

  if (deleteAttachmentError) {
    throw new Error(`Erro ao excluir anexo ${anexoId}: ${deleteAttachmentError.message}`)
  }
}

function getEquipmentSuffixMatch(nome) {
  return String(nome || '').match(/\s-\sEquipamento\s(\d+)$/i)
}

function getBaseAttachmentName(nome) {
  return String(nome || '').replace(/\s-\sEquipamento\s\d+$/i, '').trim()
}

export async function addEquipmentToDocumentacao(documentacaoId) {
  const rpcAttempt = await supabase.rpc('clone_documentacao_base_attachments_as_equipment', {
    p_documentacao_id: documentacaoId,
  })

  if (!rpcAttempt.error) {
    const rpcRow = Array.isArray(rpcAttempt.data) ? rpcAttempt.data[0] : rpcAttempt.data
    return {
      equipmentNumber: Number(rpcRow?.equipment_number || 0),
      attachments: [],
    }
  }

  if (!isMissingRpcFunctionError(rpcAttempt.error)) {
    throw new Error(`Erro ao adicionar equipamento: ${rpcAttempt.error.message}`)
  }

  const { data: anexos, error: anexosError } = await supabase
    .from('anexos')
    .select('id, nome, descricao, ordem')
    .eq('documentacao_id', documentacaoId)
    .order('ordem', { ascending: true })

  if (anexosError) {
    throw new Error(`Erro ao buscar anexos da documentação ${documentacaoId}: ${anexosError.message}`)
  }

  const currentAttachments = anexos || []

  if (currentAttachments.length === 0) {
    throw new Error('Importe ao menos um conjunto de anexos antes de adicionar outro equipamento.')
  }

  const baseAttachments = currentAttachments.filter((anexo) => !getEquipmentSuffixMatch(anexo.nome))

  if (baseAttachments.length === 0) {
    throw new Error('Não foi possível identificar os anexos base do primeiro equipamento.')
  }

  const nextEquipmentNumber =
    currentAttachments.reduce((max, anexo) => {
      const suffix = getEquipmentSuffixMatch(anexo.nome)
      return Math.max(max, suffix ? Number(suffix[1]) : 1)
    }, 1) + 1

  const existingNames = new Set(currentAttachments.map((anexo) => anexo.nome))
  const nextOrderStart = currentAttachments.length
  const payload = baseAttachments.map((anexo, index) => ({
    documentacao_id: documentacaoId,
    nome: `${getBaseAttachmentName(anexo.nome)} - Equipamento ${nextEquipmentNumber}`,
    descricao: anexo.descricao || null,
    ordem: nextOrderStart + index + 1,
  }))

  for (const attachment of payload) {
    if (existingNames.has(attachment.nome)) {
      throw new Error(`O anexo "${attachment.nome}" já existe nesta documentação.`)
    }
  }

  const { data: createdAnexos, error: createAnexosError } = await supabase
    .from('anexos')
    .insert(payload)
    .select('id, nome, ordem')

  if (createAnexosError) {
    throw new Error(`Erro ao criar anexos do novo equipamento: ${createAnexosError.message}`)
  }

  const originalSectionsByAttachmentId = {}

  for (const attachment of baseAttachments) {
    const { data: sections, error: sectionsError } = await supabase
      .from('anexo_secoes')
      .select('id, nome, ordem')
      .eq('anexo_id', attachment.id)
      .order('ordem', { ascending: true })

    if (sectionsError) {
      throw new Error(`Erro ao buscar seções do anexo ${attachment.id}: ${sectionsError.message}`)
    }

    originalSectionsByAttachmentId[attachment.id] = sections || []
  }

  const attachmentIdMap = new Map(
    baseAttachments.map((attachment, index) => [attachment.id, createdAnexos[index]?.id]).filter(([, id]) => id)
  )

  const sectionPayload = baseAttachments.flatMap((attachment) =>
    (originalSectionsByAttachmentId[attachment.id] || []).map((section) => ({
      anexo_id: attachmentIdMap.get(attachment.id),
      nome: section.nome,
      ordem: section.ordem || 0,
      ativo: true,
      _sourceSectionId: section.id,
    }))
  )

  if (sectionPayload.length === 0) {
    return {
      equipmentNumber: nextEquipmentNumber,
      attachments: createdAnexos || [],
    }
  }

  const { data: createdSections, error: createSectionsError } = await supabase
    .from('anexo_secoes')
    .insert(sectionPayload.map(({ _sourceSectionId, ...section }) => section))
    .select('id, anexo_id, nome, ordem')

  if (createSectionsError) {
    throw new Error(`Erro ao criar seções do novo equipamento: ${createSectionsError.message}`)
  }

  const originalSectionIds = sectionPayload.map((section) => section._sourceSectionId)
  const { data: originalFields, error: fieldsError } = await supabase
    .from('anexo_campos')
    .select('*')
    .in('secao_id', originalSectionIds)
    .order('ordem', { ascending: true })

  if (fieldsError) {
    throw new Error(`Erro ao buscar campos das seções originais: ${fieldsError.message}`)
  }

  const createdSectionMap = new Map()

  for (const sourceSection of sectionPayload) {
    const createdSection = (createdSections || []).find(
      (section) =>
        section.anexo_id === sourceSection.anexo_id &&
        section.nome === sourceSection.nome &&
        Number(section.ordem || 0) === Number(sourceSection.ordem || 0)
    )

    if (createdSection?.id) {
      createdSectionMap.set(sourceSection._sourceSectionId, createdSection.id)
    }
  }

  const fieldPayload = (originalFields || [])
    .map((field) => {
      const secaoId = createdSectionMap.get(field.secao_id)

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

  if (fieldPayload.length > 0) {
    let { error: createFieldsError } = await supabase.from('anexo_campos').insert(fieldPayload)

    if (createFieldsError && /label|tipo|opcoes|ativo/i.test(createFieldsError.message || '')) {
      const fallback = await supabase
        .from('anexo_campos')
        .insert(fieldPayload.map(stripOptionalCampoColumns))
      createFieldsError = fallback.error
    }

    if (createFieldsError) {
      throw new Error(`Erro ao criar campos do novo equipamento: ${createFieldsError.message}`)
    }
  }

  return {
    equipmentNumber: nextEquipmentNumber,
    attachments: createdAnexos || [],
  }
}

async function persistSingleResponse({
  documentacaoId,
  anexoId,
  secaoId,
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
        anexo_id: anexoId,
        secao_id: secaoId,
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
      anexo_id: anexoId,
      secao_id: secaoId,
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
      anexoId: resposta.anexoId,
      secaoId: resposta.secaoId,
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

export async function updateDocumentacaoCode(documentacaoId, codigo) {
  const normalizedCode = (codigo || '').trim()
  const { data, error } = await supabase
    .from('documentacoes')
    .update({ codigo: normalizedCode || null })
    .eq('id', documentacaoId)
    .select('id, codigo')
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar código da documentação ${documentacaoId}: ${error.message}`)
  }

  return data
}

export async function syncDocumentacaoStructureToModel({
  documentacaoId,
  modalidade = 'HVAC',
}) {
  const { data: documentacao, error: documentacaoError } = await supabase
    .from('documentacoes')
    .select('id, categoria, tipo')
    .eq('id', documentacaoId)
    .single()

  if (documentacaoError) {
    throw new Error(`Erro ao buscar documentação ${documentacaoId}: ${documentacaoError.message}`)
  }

  if (documentacao.categoria !== 'Qualificação') {
    throw new Error('A sincronização para modelo está disponível apenas para documentações de Qualificação.')
  }

  const qualificationType = inferQualificationTypeFromDocumentType(documentacao.tipo)

  if (!qualificationType) {
    throw new Error('Não foi possível identificar IQ, OQ ou PQ a partir do tipo da documentação.')
  }

  const { data: qualificationTypeData, error: qualificationTypeError } = await supabase
    .from('modelo_qualificacao_tipos')
    .select('id, modalidade_id, modelo_qualificacao_modalidades!inner(id, nome)')
    .eq('nome', qualificationType)
    .eq('modelo_qualificacao_modalidades.nome', modalidade)
    .single()

  if (qualificationTypeError) {
    throw new Error(`Erro ao localizar tipo ${qualificationType} da modalidade ${modalidade}: ${qualificationTypeError.message}`)
  }

  const { data: anexos, error: anexosError } = await supabase
    .from('anexos')
    .select('id, nome, descricao, ordem')
    .eq('documentacao_id', documentacaoId)
    .order('ordem', { ascending: true })

  if (anexosError) {
    throw new Error(`Erro ao buscar anexos da documentação ${documentacaoId}: ${anexosError.message}`)
  }

  const representativeByBaseName = new Map()

  for (const anexo of anexos || []) {
    const baseName = getBaseAttachmentName(anexo.nome)
    const current = representativeByBaseName.get(baseName)

    if (!current || !getEquipmentSuffixMatch(anexo.nome)) {
      representativeByBaseName.set(baseName, anexo)
    }
  }

  const selectedAttachments = Array.from(representativeByBaseName.values())

  const { data: existingModelAttachments, error: modelAttachmentsError } = await supabase
    .from('modelo_anexos')
    .select('id, nome, qualificacao_tipo_id')
    .eq('qualificacao_tipo_id', qualificationTypeData.id)

  if (modelAttachmentsError) {
    throw new Error(`Erro ao buscar anexos do modelo: ${modelAttachmentsError.message}`)
  }

  const syncedAttachmentIds = []

  for (const [attachmentIndex, anexo] of selectedAttachments.entries()) {
    let modelAttachmentId = (existingModelAttachments || []).find(
      (item) => item.nome === getBaseAttachmentName(anexo.nome)
    )?.id

    if (!modelAttachmentId) {
      const { data: createdAttachment, error: createdAttachmentError } = await supabase
        .from('modelo_anexos')
        .insert([
          {
            qualificacao_tipo_id: qualificationTypeData.id,
            nome: getBaseAttachmentName(anexo.nome),
            descricao: anexo.descricao || '',
            ordem: attachmentIndex + 1,
            ativo: true,
          },
        ])
        .select('id')
        .single()

      if (createdAttachmentError) {
        throw new Error(`Erro ao criar anexo no modelo: ${createdAttachmentError.message}`)
      }

      modelAttachmentId = createdAttachment.id
    } else {
      const { error: updateAttachmentError } = await supabase
        .from('modelo_anexos')
        .update({
          nome: getBaseAttachmentName(anexo.nome),
          descricao: anexo.descricao || '',
          ordem: attachmentIndex + 1,
          ativo: true,
        })
        .eq('id', modelAttachmentId)

      if (updateAttachmentError) {
        throw new Error(`Erro ao atualizar anexo do modelo: ${updateAttachmentError.message}`)
      }
    }

    syncedAttachmentIds.push(modelAttachmentId)

    const { data: secoes, error: secoesError } = await supabase
      .from('anexo_secoes')
      .select('id, nome, ordem')
      .eq('anexo_id', anexo.id)
      .order('ordem', { ascending: true })

    if (secoesError) {
      throw new Error(`Erro ao buscar seções do anexo ${anexo.id}: ${secoesError.message}`)
    }

    const { data: existingModelSections, error: existingModelSectionsError } = await supabase
      .from('modelo_anexo_secoes')
      .select('id, nome')
      .eq('modelo_anexo_id', modelAttachmentId)

    if (existingModelSectionsError) {
      throw new Error(`Erro ao buscar seções do modelo: ${existingModelSectionsError.message}`)
    }

    const syncedSectionIds = []

    for (const [sectionIndex, secao] of (secoes || []).entries()) {
      let modelSectionId = (existingModelSections || []).find((item) => item.nome === secao.nome)?.id

      if (!modelSectionId) {
        const { data: createdSection, error: createdSectionError } = await supabase
          .from('modelo_anexo_secoes')
          .insert([
            {
              modelo_anexo_id: modelAttachmentId,
              nome: secao.nome,
              ordem: sectionIndex + 1,
              ativo: true,
            },
          ])
          .select('id')
          .single()

        if (createdSectionError) {
          throw new Error(`Erro ao criar seção no modelo: ${createdSectionError.message}`)
        }

        modelSectionId = createdSection.id
      } else {
        const { error: updateSectionError } = await supabase
          .from('modelo_anexo_secoes')
          .update({
            nome: secao.nome,
            ordem: sectionIndex + 1,
            ativo: true,
          })
          .eq('id', modelSectionId)

        if (updateSectionError) {
          throw new Error(`Erro ao atualizar seção do modelo: ${updateSectionError.message}`)
        }
      }

      syncedSectionIds.push(modelSectionId)

      const { data: campos, error: camposError } = await fetchSectionFields(secao.id)

      if (camposError) {
        throw new Error(`Erro ao buscar campos da seção ${secao.id}: ${camposError.message}`)
      }

      const { data: existingModelFields, error: existingModelFieldsError } = await supabase
        .from('modelo_anexo_campos')
        .select('id, nome')
        .eq('modelo_secao_id', modelSectionId)

      if (existingModelFieldsError) {
        throw new Error(`Erro ao buscar campos do modelo: ${existingModelFieldsError.message}`)
      }

      const syncedFieldIds = []

      for (const [fieldIndex, campo] of (campos || []).entries()) {
        let modelFieldId = (existingModelFields || []).find((item) => item.nome === campo.nome)?.id

        if (!modelFieldId) {
          const { data: createdField, error: createdFieldError } = await supabase
            .from('modelo_anexo_campos')
            .insert([
              {
                modelo_secao_id: modelSectionId,
                nome: campo.nome,
                label: campo.label || campo.nome,
                tipo: campo.tipo || 'text',
                ordem: fieldIndex + 1,
                opcoes: campo.opcoes || '',
                ativo: true,
              },
            ])
            .select('id')
            .single()

          if (createdFieldError) {
            throw new Error(`Erro ao criar campo no modelo: ${createdFieldError.message}`)
          }

          modelFieldId = createdField.id
        } else {
          const { error: updateFieldError } = await supabase
            .from('modelo_anexo_campos')
            .update({
              nome: campo.nome,
              label: campo.label || campo.nome,
              tipo: campo.tipo || 'text',
              ordem: fieldIndex + 1,
              opcoes: campo.opcoes || '',
              ativo: true,
            })
            .eq('id', modelFieldId)

          if (updateFieldError) {
            throw new Error(`Erro ao atualizar campo do modelo: ${updateFieldError.message}`)
          }
        }

        syncedFieldIds.push(modelFieldId)
      }

      if (syncedFieldIds.length > 0) {
        const { error: deactivateModelFieldsError } = await supabase
          .from('modelo_anexo_campos')
          .update({ ativo: false })
          .eq('modelo_secao_id', modelSectionId)
          .not('id', 'in', `(${syncedFieldIds.join(',')})`)

        if (deactivateModelFieldsError) {
          throw new Error(`Erro ao desativar campos antigos do modelo: ${deactivateModelFieldsError.message}`)
        }
      }
    }

    if (syncedSectionIds.length > 0) {
      const { error: deactivateSectionsError } = await supabase
        .from('modelo_anexo_secoes')
        .update({ ativo: false })
        .eq('modelo_anexo_id', modelAttachmentId)
        .not('id', 'in', `(${syncedSectionIds.join(',')})`)

      if (deactivateSectionsError) {
        throw new Error(`Erro ao desativar seções antigas do modelo: ${deactivateSectionsError.message}`)
      }
    }
  }

  if (syncedAttachmentIds.length > 0) {
    const { error: deactivateAttachmentsError } = await supabase
      .from('modelo_anexos')
      .update({ ativo: false })
      .eq('qualificacao_tipo_id', qualificationTypeData.id)
      .not('id', 'in', `(${syncedAttachmentIds.join(',')})`)

    if (deactivateAttachmentsError) {
      throw new Error(`Erro ao desativar anexos antigos do modelo: ${deactivateAttachmentsError.message}`)
    }
  }

  return {
    syncedAttachments: syncedAttachmentIds.length,
  }
}
