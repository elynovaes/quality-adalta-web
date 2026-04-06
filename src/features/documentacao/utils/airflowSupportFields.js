export const AIRFLOW_BLOCK_LABELS = [
  'Duto de ar de insuflamento',
  'Duto de ar de retorno',
  'Duto de ar externo',
]

export const AIRFLOW_METHOD_SUFFIX = 'Método de medição'
export const AIRFLOW_SEGMENT_COUNT_SUFFIX = 'Quantidade de trechos'
export const AIRFLOW_SEGMENT_NOMINALS_SUFFIX = 'Vazões nominais dos trechos'
export const AIRFLOW_CONFIGURATION_FIELD = 'Configuração dos dutos'
export const AIRFLOW_ACCEPTANCE_SUFFIX = 'Critério de aceitação por ponto'
export const AIRFLOW_MATRIX_STORAGE_SUFFIX = 'Leituras da matriz'
export const AIRFLOW_SEGMENTS_DATA_SUFFIX = 'Trechos de pitot'
export const AIRFLOW_MEASURED_FLOW_SUFFIX = 'Vazão medida'
export const AIRFLOW_PERCENTAGE_SUFFIX = '% em relação à vazão nominal'
export const AIRFLOW_OUTLET_SUM_SUFFIX = 'Somatório de bocas'
export const AIRFLOW_DEVIATION_COMMENT_SUFFIX = 'Comentário de desvio'

const AIRFLOW_FIELD_TEMPLATES = [
  {
    suffix: AIRFLOW_METHOD_SUFFIX,
    label: AIRFLOW_METHOD_SUFFIX,
    tipo: 'select',
    opcoes: 'Tubo de Pitot;Somatório de bocas',
    supportsOutletSumOnly: true,
  },
  {
    suffix: AIRFLOW_SEGMENT_COUNT_SUFFIX,
    label: AIRFLOW_SEGMENT_COUNT_SUFFIX,
    tipo: 'number',
  },
  {
    suffix: AIRFLOW_MATRIX_STORAGE_SUFFIX,
    label: AIRFLOW_MATRIX_STORAGE_SUFFIX,
    tipo: 'json',
  },
  {
    suffix: AIRFLOW_SEGMENTS_DATA_SUFFIX,
    label: AIRFLOW_SEGMENTS_DATA_SUFFIX,
    tipo: 'json',
  },
  {
    suffix: AIRFLOW_SEGMENT_NOMINALS_SUFFIX,
    label: AIRFLOW_SEGMENT_NOMINALS_SUFFIX,
    tipo: 'json',
  },
  {
    suffix: AIRFLOW_ACCEPTANCE_SUFFIX,
    label: AIRFLOW_ACCEPTANCE_SUFFIX,
    tipo: 'text',
  },
  {
    suffix: AIRFLOW_MEASURED_FLOW_SUFFIX,
    label: AIRFLOW_MEASURED_FLOW_SUFFIX,
    tipo: 'number',
  },
  {
    suffix: AIRFLOW_PERCENTAGE_SUFFIX,
    label: AIRFLOW_PERCENTAGE_SUFFIX,
    tipo: 'text',
  },
  {
    suffix: AIRFLOW_OUTLET_SUM_SUFFIX,
    label: AIRFLOW_OUTLET_SUM_SUFFIX,
    tipo: 'number',
    supportsOutletSumOnly: true,
  },
  {
    suffix: AIRFLOW_DEVIATION_COMMENT_SUFFIX,
    label: AIRFLOW_DEVIATION_COMMENT_SUFFIX,
    tipo: 'textarea',
  },
]

export function isAirflowSectionName(nome) {
  const normalized = String(nome || '').trim().toLowerCase()
  return normalized === 'vazão de ar' || normalized === 'vazao de ar'
}

export function supportsOutletSumBlock(blockLabel) {
  return blockLabel === 'Duto de ar de insuflamento' || blockLabel === 'Duto de ar de retorno'
}

export function isVirtualAirflowFieldId(value) {
  return String(value || '').startsWith('virtual-airflow:')
}

export function buildMissingAirflowSupportFields(secaoId, secaoNome, campos = []) {
  if (!isAirflowSectionName(secaoNome)) {
    return []
  }

  const currentNames = new Set((campos || []).map((field) => field.nome))
  const maxOrder = (campos || []).reduce((max, field) => Math.max(max, Number(field.ordem || 0)), 0)
  const blockSpan = AIRFLOW_FIELD_TEMPLATES.length + 2

  const missingFields = []

  if (!currentNames.has(AIRFLOW_CONFIGURATION_FIELD)) {
    missingFields.push({
      secao_id: secaoId,
      nome: AIRFLOW_CONFIGURATION_FIELD,
      label: AIRFLOW_CONFIGURATION_FIELD,
      tipo: 'select',
      opcoes:
        '100% ar externo - somente insuflamento;Insuflamento + retorno;Insuflamento + ar externo;Insuflamento + retorno + ar externo',
      ordem: 1,
      ativo: true,
    })
  }

  AIRFLOW_BLOCK_LABELS.forEach((blockLabel, blockIndex) => {
    AIRFLOW_FIELD_TEMPLATES.forEach((template, templateIndex) => {
      if (template.supportsOutletSumOnly && !supportsOutletSumBlock(blockLabel)) {
        return
      }

      const nome = `${blockLabel} - ${template.suffix}`

      if (currentNames.has(nome)) {
        return
      }

      missingFields.push({
        secao_id: secaoId,
        nome,
        label: template.label,
        tipo: template.tipo,
        opcoes: template.opcoes || '',
        ordem: maxOrder + blockIndex * blockSpan + templateIndex + 2,
        ativo: true,
      })
    })
  })

  return missingFields
}

export function mergeAirflowSupportFields(secaoId, secaoNome, campos = []) {
  const missingFields = buildMissingAirflowSupportFields(secaoId, secaoNome, campos)

  if (!missingFields.length) {
    return campos
  }

  const virtualFields = missingFields.map((field) => ({
    ...field,
    id: `virtual-airflow:${secaoId}:${field.nome}`,
  }))

  return [...campos, ...virtualFields].sort((left, right) => Number(left.ordem || 0) - Number(right.ordem || 0))
}
