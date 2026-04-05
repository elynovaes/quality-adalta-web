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
    source: 'fallback',
  }
}

export async function fetchDocumentacaoModelCatalog() {
  const [reportTypesResult, modalitiesResult, qualificationTypesResult, attachmentsResult] =
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
    ])

  const errors = [
    reportTypesResult.error,
    modalitiesResult.error,
    qualificationTypesResult.error,
    attachmentsResult.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    if (errors.every(isMissingTableError)) {
      return createDefaultCatalog()
    }

    throw new Error(errors[0].message)
  }

  const modalities = modalitiesResult.data || []
  const qualificationTypes = qualificationTypesResult.data || []
  const attachments = attachmentsResult.data || []
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

export async function fetchAttachmentsForQualification({ modalidade, qualificationType }) {
  const catalog = await fetchDocumentacaoModelCatalog()
  return catalog.attachmentsByKey[`${modalidade}:${qualificationType}`] || []
}
