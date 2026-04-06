import { supabase } from '@/lib/supabase'

const DEFAULT_REPORT_TYPES = ['Avaliação', 'Comissionamento', 'TAB', 'Qualificação']
const DEFAULT_QUALIFICATION_MODALITIES = ['HVAC', 'Equipamentos', 'Gases']
const DEFAULT_HVAC_QUALIFICATION_TYPES = ['IQ', 'OQ', 'PQ']
const DEFAULT_HVAC_OQ_ATTACHMENTS = [
  {
    nome: 'Startup de UTA',
    descricao: 'Anexo inicial para partida da UTA.',
    ordem: 1,
  },
  {
    nome: 'Inspeção de operação de UTA',
    descricao: 'Checklist operacional da UTA.',
    ordem: 2,
  },
  {
    nome: 'Startup de ventiladores e exaustores',
    descricao: 'Anexo inicial para partida de ventiladores e exaustores.',
    ordem: 3,
  },
  {
    nome: 'Inspeção de operação de ventiladores e exaustores',
    descricao: 'Checklist operacional de ventiladores e exaustores.',
    ordem: 4,
  },
]

const DEFAULT_MODEL_SECTIONS = {
  'HVAC:OQ:Startup de UTA': [],
}

const IDENTIFICATION_DEFAULT_FIELDS = [
  {
    nome: 'Data de Inspeção',
    label: 'Data de Inspeção',
    tipo: 'date',
  },
  {
    nome: 'Procedimento',
    label: 'Procedimento',
    tipo: 'select',
    opcoes: 'AD-PT-OQ-SUT',
  },
  {
    nome: 'Sistema/Área',
    label: 'Sistema/Área',
    tipo: 'text',
  },
  {
    nome: 'Equipamento',
    label: 'Equipamento',
    tipo: 'text',
  },
  {
    nome: 'Alicate Amperímetro',
    label: 'Nº de série',
    tipo: 'text',
  },
  {
    nome: 'Balômetro',
    label: 'Nº de série',
    tipo: 'text',
  },
  {
    nome: 'Manômetro TA SCOPE',
    label: 'Nº de série',
    tipo: 'text',
  },
].map((field, index) => ({
  ...field,
  ordem: index + 1,
}))

const AIRFLOW_BLOCKS = [
  'Duto de ar de insuflamento',
  'Duto de ar de retorno',
  'Duto de ar externo',
]
const AIRFLOW_CONFIGURATION_FIELD = {
  nome: 'Configuração dos dutos',
  label: 'Configuração dos dutos',
  tipo: 'select',
  opcoes:
    '100% ar externo - somente insuflamento;Insuflamento + retorno;Insuflamento + ar externo;Insuflamento + retorno + ar externo',
  ordem: 1,
}

const AIRFLOW_FIELD_TEMPLATES = [
  {
    suffix: 'Método de medição',
    label: 'Método de medição',
    tipo: 'select',
    opcoes: 'Tubo de Pitot;Somatório de bocas',
  },
  {
    suffix: 'Quantidade de trechos',
    label: 'Quantidade de trechos',
    tipo: 'number',
  },
  {
    suffix: 'Vazão nominal',
    label: 'Vazão nominal (m³/h)',
    tipo: 'number',
  },
  {
    suffix: 'Largura',
    label: 'Largura (m)',
    tipo: 'number',
  },
  {
    suffix: 'Altura',
    label: 'Altura (m)',
    tipo: 'number',
  },
  {
    suffix: 'Área',
    label: 'Área (m²)',
    tipo: 'number',
  },
  {
    suffix: 'Pontos de matriz',
    label: 'Pontos de matriz',
    tipo: 'number',
  },
  {
    suffix: 'Critério de aceitação por ponto',
    label: 'Critério de aceitação por ponto',
    tipo: 'text',
  },
  {
    suffix: 'Leituras da matriz',
    label: 'Leituras da matriz',
    tipo: 'json',
  },
  {
    suffix: 'Trechos de pitot',
    label: 'Trechos de pitot',
    tipo: 'json',
  },
  {
    suffix: 'Vazões nominais dos trechos',
    label: 'Vazões nominais dos trechos',
    tipo: 'json',
  },
  {
    suffix: 'Vazão medida',
    label: 'Vazão medida',
    tipo: 'number',
  },
  {
    suffix: '% em relação à vazão nominal',
    label: '% em relação à vazão nominal',
    tipo: 'text',
  },
  {
    suffix: 'Somatório de bocas',
    label: 'Somatório de bocas (m³/h)',
    tipo: 'number',
  },
  {
    suffix: 'Comentário de desvio',
    label: 'Comentário de desvio',
    tipo: 'textarea',
  },
]

const AIRFLOW_DEFAULT_FIELDS = [
  AIRFLOW_CONFIGURATION_FIELD,
  ...AIRFLOW_BLOCKS.flatMap((blockLabel, blockIndex) =>
    AIRFLOW_FIELD_TEMPLATES.map((field, fieldIndex) => ({
      nome: `${blockLabel} - ${field.suffix}`,
      label: field.label,
      tipo: field.tipo,
      ordem: blockIndex * AIRFLOW_FIELD_TEMPLATES.length + fieldIndex + 2,
    }))
  ),
]

function isMissingTableError(error) {
  return /does not exist|Could not find the table|relation .* does not exist/i.test(error?.message || '')
}

function createDefaultCatalog() {
  return {
    reportTypes: DEFAULT_REPORT_TYPES,
    qualificationModalities: DEFAULT_QUALIFICATION_MODALITIES,
    qualificationTypesByModality: {
      HVAC: DEFAULT_HVAC_QUALIFICATION_TYPES,
      Equipamentos: [],
      Gases: [],
    },
    attachmentsByKey: {
      'HVAC:OQ': DEFAULT_HVAC_OQ_ATTACHMENTS,
    },
    sectionsByAttachmentId: {},
    fallbackSectionsByKey: DEFAULT_MODEL_SECTIONS,
    source: 'fallback',
  }
}

export async function fetchDocumentacaoModelCatalog() {
  const [reportTypesResult, modalitiesResult, qualificationTypesResult, attachmentsResult, sectionsResult] =
    await Promise.all([
      supabase.from('modelo_tipos_relatorio').select('nome, ordem').order('ordem'),
      supabase.from('modelo_qualificacao_modalidades').select('id, nome, ordem').order('ordem'),
      supabase
        .from('modelo_qualificacao_tipos')
        .select('id, nome, ordem, modalidade_id')
        .order('ordem'),
      supabase
        .from('modelo_anexos')
        .select('id, nome, descricao, ordem, qualificacao_tipo_id, ativo')
        .eq('ativo', true)
        .order('ordem'),
      supabase
        .from('modelo_anexo_secoes')
        .select('id, nome, ordem, modelo_anexo_id, ativo')
        .eq('ativo', true)
        .order('ordem'),
    ])

  const coreErrors = [
    reportTypesResult.error,
    modalitiesResult.error,
    qualificationTypesResult.error,
    attachmentsResult.error,
  ].filter(Boolean)

  if (coreErrors.length > 0) {
    if (coreErrors.every(isMissingTableError)) {
      return createDefaultCatalog()
    }

    throw new Error(coreErrors[0].message)
  }

  const modalities = modalitiesResult.data || []
  const qualificationTypes = qualificationTypesResult.data || []
  const attachments = attachmentsResult.data || []
  const sections = isMissingTableError(sectionsResult.error) ? [] : sectionsResult.data || []
  const modalityMap = new Map(modalities.map((item) => [item.id, item.nome]))
  const qualificationTypeMap = new Map(
    qualificationTypes.map((item) => [
      item.id,
      {
        nome: item.nome,
        modalidade: modalityMap.get(item.modalidade_id) || null,
      },
    ])
  )
  const attachmentNameById = new Map(attachments.map((item) => [item.id, item.nome]))

  return {
    reportTypes: (reportTypesResult.data || []).map((item) => item.nome),
    qualificationModalities: modalities.map((item) => item.nome),
    qualificationTypesByModality: modalities.reduce((acc, modality) => {
      acc[modality.nome] = qualificationTypes
        .filter((item) => item.modalidade_id === modality.id)
        .map((item) => item.nome)
      return acc
    }, {}),
    attachmentsByKey: attachments.reduce((acc, item) => {
      const qualificationType = qualificationTypeMap.get(item.qualificacao_tipo_id)

      if (!qualificationType?.modalidade) {
        return acc
      }

      const key = `${qualificationType.modalidade}:${qualificationType.nome}`

      if (!acc[key]) {
        acc[key] = []
      }

      acc[key].push({
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || '',
        ordem: item.ordem || 0,
      })
      return acc
    }, {}),
    sectionsByAttachmentId: sections.reduce((acc, item) => {
      if (!acc[item.modelo_anexo_id]) {
        acc[item.modelo_anexo_id] = []
      }

      acc[item.modelo_anexo_id].push({
        id: item.id,
        nome: item.nome,
        ordem: item.ordem || 0,
      })
      return acc
    }, {}),
    fallbackSectionsByKey: attachments.reduce((acc, item) => {
      const qualificationType = qualificationTypeMap.get(item.qualificacao_tipo_id)

      if (!qualificationType?.modalidade) {
        return acc
      }

      const key = `${qualificationType.modalidade}:${qualificationType.nome}:${attachmentNameById.get(item.id) || item.nome}`
      acc[key] = DEFAULT_MODEL_SECTIONS[key] || []
      return acc
    }, {}),
    source: 'database',
  }
}

async function getNextOrder(tableName, filter = null) {
  let query = supabase.from(tableName).select('ordem').order('ordem', { ascending: false }).limit(1)

  if (filter?.column && filter?.value !== undefined) {
    query = query.eq(filter.column, filter.value)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data?.[0]?.ordem || 0) + 1
}

export async function addModelReportType(nome) {
  const ordem = await getNextOrder('modelo_tipos_relatorio')
  const { data, error } = await supabase
    .from('modelo_tipos_relatorio')
    .insert([{ nome, ordem }])
    .select('id, nome, ordem')
    .single()

  if (error) {
    throw new Error(`Erro ao adicionar tipo de relatório: ${error.message}`)
  }

  return data
}

export async function addQualificationModality(nome) {
  const ordem = await getNextOrder('modelo_qualificacao_modalidades')
  const { data, error } = await supabase
    .from('modelo_qualificacao_modalidades')
    .insert([{ nome, ordem }])
    .select('id, nome, ordem')
    .single()

  if (error) {
    throw new Error(`Erro ao adicionar modalidade: ${error.message}`)
  }

  return data
}

export async function addQualificationType({ modalidade, nome }) {
  const { data: modalidadeData, error: modalidadeError } = await supabase
    .from('modelo_qualificacao_modalidades')
    .select('id')
    .eq('nome', modalidade)
    .single()

  if (modalidadeError) {
    throw new Error(`Erro ao localizar modalidade ${modalidade}: ${modalidadeError.message}`)
  }

  const ordem = await getNextOrder('modelo_qualificacao_tipos', {
    column: 'modalidade_id',
    value: modalidadeData.id,
  })

  const { data, error } = await supabase
    .from('modelo_qualificacao_tipos')
    .insert([
      {
        modalidade_id: modalidadeData.id,
        nome,
        ordem,
      },
    ])
    .select('id, nome, ordem')
    .single()

  if (error) {
    throw new Error(`Erro ao adicionar tipo de qualificação: ${error.message}`)
  }

  return data
}

export async function addAttachmentModel({ modalidade, qualificationType, nome, descricao = '' }) {
  const qualificationTypeResult = await supabase
    .from('modelo_qualificacao_tipos')
    .select('id, modalidade_id')
    .eq('nome', qualificationType)
    .single()

  if (qualificationTypeResult.error) {
    throw new Error(
      `Erro ao localizar tipo de qualificação ${qualificationType}: ${qualificationTypeResult.error.message}`
    )
  }

  const modalidadeResult = await supabase
    .from('modelo_qualificacao_modalidades')
    .select('id')
    .eq('nome', modalidade)
    .single()

  if (modalidadeResult.error || qualificationTypeResult.data.modalidade_id !== modalidadeResult.data.id) {
    throw new Error(`A modalidade ${modalidade} não corresponde ao tipo ${qualificationType}.`)
  }

  const ordem = await getNextOrder('modelo_anexos', {
    column: 'qualificacao_tipo_id',
    value: qualificationTypeResult.data.id,
  })

  const { data, error } = await supabase
    .from('modelo_anexos')
    .insert([
      {
        qualificacao_tipo_id: qualificationTypeResult.data.id,
        nome,
        descricao,
        ordem,
        ativo: true,
      },
    ])
    .select('id, nome, descricao, ordem')
    .single()

  if (error) {
    throw new Error(`Erro ao adicionar anexo ao modelo: ${error.message}`)
  }

  return data
}

export async function addAttachmentSectionModel({ attachmentId, nome }) {
  const ordem = await getNextOrder('modelo_anexo_secoes', {
    column: 'modelo_anexo_id',
    value: attachmentId,
  })

  const { data, error } = await supabase
    .from('modelo_anexo_secoes')
    .insert([
      {
        modelo_anexo_id: attachmentId,
        nome,
        ordem,
        ativo: true,
      },
    ])
    .select('id, nome, ordem')
    .single()

  if (error) {
    throw new Error(`Erro ao adicionar seção ao anexo do modelo: ${error.message}`)
  }

  return data
}

export async function fetchAttachmentModelDetails(attachmentId) {
  const { data: attachment, error: attachmentError } = await supabase
    .from('modelo_anexos')
    .select(
      `
        id,
        nome,
        descricao,
        ordem,
        qualificacao_tipo_id,
        modelo_qualificacao_tipos (
          id,
          nome,
          modalidade_id,
          modelo_qualificacao_modalidades (id, nome)
        )
      `
    )
    .eq('id', attachmentId)
    .single()

  if (attachmentError) {
    throw new Error(`Erro ao carregar anexo do modelo: ${attachmentError.message}`)
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('modelo_anexo_secoes')
    .select('id, nome, ordem, ativo')
    .eq('modelo_anexo_id', attachmentId)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (sectionsError) {
    if (isMissingTableError(sectionsError)) {
      return {
        attachment: {
          id: attachment.id,
          nome: attachment.nome,
          descricao: attachment.descricao || '',
          ordem: attachment.ordem || 0,
          qualificationType: attachment.modelo_qualificacao_tipos?.nome || '',
          modality:
            attachment.modelo_qualificacao_tipos?.modelo_qualificacao_modalidades?.nome || '',
        },
        sections: [],
      }
    }

    throw new Error(`Erro ao carregar seções do anexo do modelo: ${sectionsError.message}`)
  }

  let fields = []
  let fieldsError = null

  if ((sections || []).length > 0) {
    const result = await supabase
      .from('modelo_anexo_campos')
      .select('id, nome, label, tipo, ordem, modelo_secao_id, opcoes, ativo')
      .in('modelo_secao_id', (sections || []).map((section) => section.id))
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    fields = result.data || []
    fieldsError = result.error
  }

  if (fieldsError && !isMissingTableError(fieldsError)) {
    throw new Error(`Erro ao carregar campos do anexo do modelo: ${fieldsError.message}`)
  }

  const fieldsBySectionId = (fields || []).reduce((acc, field) => {
    if (!acc[field.modelo_secao_id]) {
      acc[field.modelo_secao_id] = []
    }

    acc[field.modelo_secao_id].push({
      id: field.id,
      nome: field.nome,
      label: field.label || field.nome,
      tipo: field.tipo || 'text',
      ordem: field.ordem || 0,
      opcoes: field.opcoes || '',
    })
    return acc
  }, {})

  return {
    attachment: {
      id: attachment.id,
      nome: attachment.nome,
      descricao: attachment.descricao || '',
      ordem: attachment.ordem || 0,
      qualificationType: attachment.modelo_qualificacao_tipos?.nome || '',
      modality:
        attachment.modelo_qualificacao_tipos?.modelo_qualificacao_modalidades?.nome || '',
    },
    sections: (sections || []).map((section) => ({
      ...section,
      campos: fieldsBySectionId[section.id] || [],
    })),
  }
}

export async function renameAttachmentSectionModel({ sectionId, nome }) {
  const { data, error } = await supabase
    .from('modelo_anexo_secoes')
    .update({ nome })
    .eq('id', sectionId)
    .select('id, nome, ordem')
    .single()

  if (error) {
    throw new Error(`Erro ao renomear seção do modelo: ${error.message}`)
  }

  return data
}

export async function deleteAttachmentSectionModel(sectionId) {
  const { error } = await supabase
    .from('modelo_anexo_secoes')
    .delete()
    .eq('id', sectionId)

  if (error) {
    throw new Error(`Erro ao excluir seção do modelo: ${error.message}`)
  }
}

export async function reorderAttachmentSectionModels(sections) {
  for (const [index, section] of sections.entries()) {
    const { error } = await supabase
      .from('modelo_anexo_secoes')
      .update({ ordem: index + 1 })
      .eq('id', section.id)

    if (error) {
      throw new Error(`Erro ao reordenar seções do modelo: ${error.message}`)
    }
  }
}

export async function addAttachmentSectionFieldModel({
  sectionId,
  nome,
  tipo = 'text',
  label = nome,
  opcoes = '',
}) {
  const ordem = await getNextOrder('modelo_anexo_campos', {
    column: 'modelo_secao_id',
    value: sectionId,
  })

  const { data, error } = await supabase
    .from('modelo_anexo_campos')
    .insert([
      {
        modelo_secao_id: sectionId,
        nome,
        label,
        tipo,
        ordem,
        opcoes,
        ativo: true,
      },
    ])
    .select('id, nome, label, tipo, ordem, opcoes')
    .single()

  if (error) {
    throw new Error(`Erro ao adicionar campo ao modelo: ${error.message}`)
  }

  return data
}

export async function ensureIdentificationFieldsForSection(sectionId) {
  return syncDefaultFieldsForSection(sectionId, IDENTIFICATION_DEFAULT_FIELDS, 'Identificação')
}

export async function ensureAirflowFieldsForSection(sectionId) {
  return syncDefaultFieldsForSection(sectionId, AIRFLOW_DEFAULT_FIELDS, 'Vazão de Ar')
}

async function syncDefaultFieldsForSection(sectionId, definitions, sectionLabel) {
  const { data: currentFields, error: currentFieldsError } = await supabase
    .from('modelo_anexo_campos')
    .select('id, nome, label, tipo, ordem, opcoes')
    .eq('modelo_secao_id', sectionId)

  if (currentFieldsError) {
    throw new Error(`Erro ao consultar campos da seção do modelo: ${currentFieldsError.message}`)
  }

  const currentNames = new Set((currentFields || []).map((field) => field.nome))
  const missingFields = definitions.filter((field) => !currentNames.has(field.nome))

  for (const definition of definitions) {
    const existingField = (currentFields || []).find((field) => field.nome === definition.nome)

    if (!existingField) {
      continue
    }

    if (
      existingField.label === definition.label &&
      existingField.tipo === definition.tipo &&
      Number(existingField.ordem || 0) === Number(definition.ordem || 0) &&
      (existingField.opcoes || '') === (definition.opcoes || '')
    ) {
      continue
    }

    const { error: updateError } = await supabase
      .from('modelo_anexo_campos')
      .update({
        label: definition.label,
        tipo: definition.tipo,
        ordem: definition.ordem,
        opcoes: definition.opcoes || '',
      })
      .eq('id', existingField.id)

    if (updateError) {
      throw new Error(`Erro ao atualizar campo padrão de ${sectionLabel}: ${updateError.message}`)
    }
  }

  if (missingFields.length === 0) {
    return []
  }

  const payload = missingFields.map((field, index) => ({
    modelo_secao_id: sectionId,
    nome: field.nome,
    label: field.label,
    tipo: field.tipo,
    ordem: (currentFields?.length || 0) + index + 1,
    opcoes: field.opcoes || '',
    ativo: true,
  }))

  const { data, error } = await supabase
    .from('modelo_anexo_campos')
    .insert(payload)
    .select('id, nome, label, tipo, ordem, opcoes')

  if (error) {
    throw new Error(`Erro ao criar campos padrão de ${sectionLabel}: ${error.message}`)
  }

  return data || []
}

export async function fetchAttachmentsForQualification({ modalidade, qualificationType }) {
  const catalog = await fetchDocumentacaoModelCatalog()
  return catalog.attachmentsByKey[`${modalidade}:${qualificationType}`] || []
}

export async function fetchModelSectionsForAttachment({ attachmentId, modalidade, qualificationType, attachmentName }) {
  const catalog = await fetchDocumentacaoModelCatalog()

  if (attachmentId && catalog.sectionsByAttachmentId?.[attachmentId]) {
    return catalog.sectionsByAttachmentId[attachmentId]
  }

  return catalog.fallbackSectionsByKey?.[`${modalidade}:${qualificationType}:${attachmentName}`] || []
}

export async function reorderAttachmentModels(attachments) {
  for (const [index, attachment] of attachments.entries()) {
    const { error } = await supabase
      .from('modelo_anexos')
      .update({ ordem: index + 1 })
      .eq('id', attachment.id)

    if (error) {
      throw new Error(`Erro ao reordenar anexos do modelo: ${error.message}`)
    }
  }
}
