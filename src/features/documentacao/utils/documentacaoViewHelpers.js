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
} from '@/features/documentacao/utils/airflowSupportFields'

export {
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
}

export function normalizeCampoTipo(value) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeCampoNome(campo) {
  return String(campo?.nome || '').trim().toLowerCase()
}

export function getCampoKind(campo) {
  const normalizedName = normalizeCampoTipo(campo?.nome)
  const normalizedLabel = normalizeCampoTipo(campo?.label)
  const normalizedType = normalizeCampoTipo(campo?.tipo)

  if (
    normalizedName === 'data de inspeção' ||
    normalizedName === 'data de inspecao' ||
    normalizedLabel === 'data de inspeção' ||
    normalizedLabel === 'data de inspecao'
  ) {
    return 'date'
  }

  if (normalizedName === 'procedimento' || normalizedLabel === 'procedimento') {
    return 'select'
  }

  if (
    normalizedName.endsWith('método de medição') ||
    normalizedName.endsWith('metodo de medicao') ||
    normalizedLabel === 'método de medição' ||
    normalizedLabel === 'metodo de medicao'
  ) {
    return 'select'
  }

  if (
    normalizedName === 'configuração dos dutos' ||
    normalizedName === 'configuracao dos dutos' ||
    normalizedLabel === 'configuração dos dutos' ||
    normalizedLabel === 'configuracao dos dutos'
  ) {
    return 'select'
  }

  if (
    normalizedType.includes('textarea') ||
    normalizedType.includes('longo') ||
    normalizedType.includes('multilinha')
  ) {
    return 'textarea'
  }

  if (normalizedType.includes('select') || normalizedType.includes('lista')) {
    return 'select'
  }

  if (
    normalizedType.includes('checkbox') ||
    normalizedType.includes('boolean') ||
    normalizedType.includes('bool')
  ) {
    return 'checkbox'
  }

  if (normalizedType.includes('date') || normalizedType.includes('data')) {
    return 'date'
  }

  if (normalizedType.includes('number') || normalizedType.includes('numero')) {
    return 'number'
  }

  return 'text'
}

export function getCampoLabel(campo) {
  return campo.label || campo.nome || `Campo ${campo.id}`
}

export function isInstrumentField(campo) {
  const normalizedName = normalizeCampoNome(campo)

  return (
    normalizedName === 'alicate amperímetro'.toLowerCase() ||
    normalizedName === 'alicate amperimetro' ||
    normalizedName === 'balômetro'.toLowerCase() ||
    normalizedName === 'balometro' ||
    normalizedName === 'manômetro ta scope'.toLowerCase() ||
    normalizedName === 'manometro ta scope'
  )
}

export function isIdentificationSection(secao) {
  const normalizedName = String(secao?.nome || '').trim().toLowerCase()
  return normalizedName === 'identificação' || normalizedName === 'identificacao'
}

export function isAirflowSection(secao) {
  const normalizedName = String(secao?.nome || '').trim().toLowerCase()
  return normalizedName === 'vazão de ar' || normalizedName === 'vazao de ar'
}

export function parseCampoOptions(campo) {
  const normalizedName = normalizeCampoNome(campo)
  const normalizedLabel = normalizeCampoTipo(campo?.label)
  const rawOptions = campo.opcoes || campo.options || ''

  if (Array.isArray(rawOptions)) {
    return rawOptions.filter(Boolean)
  }

  if (typeof rawOptions !== 'string' || rawOptions.trim() === '') {
    if (normalizedName === 'procedimento') {
      return ['AD-PT-OQ-SUT']
    }

    if (normalizedName === 'configuração dos dutos' || normalizedName === 'configuracao dos dutos') {
      return [
        '100% ar externo - somente insuflamento',
        'Insuflamento + retorno',
        'Insuflamento + ar externo',
        'Insuflamento + retorno + ar externo',
      ]
    }

    if (
      normalizedName.endsWith('método de medição') ||
      normalizedName.endsWith('metodo de medicao') ||
      normalizedLabel === 'método de medição' ||
      normalizedLabel === 'metodo de medicao'
    ) {
      return ['Tubo de Pitot', 'Somatório de bocas']
    }

    return []
  }

  return rawOptions
    .split(/\r?\n|;|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function isAirflowMatrixStorageField(campo) {
  return String(campo?.nome || '').endsWith(` - ${AIRFLOW_MATRIX_STORAGE_SUFFIX}`)
}

export function isAirflowDeviationCommentField(campo) {
  return String(campo?.nome || '').endsWith(` - ${AIRFLOW_DEVIATION_COMMENT_SUFFIX}`)
}

export function isAirflowSegmentsStorageField(campo) {
  return (
    String(campo?.nome || '').endsWith(` - ${AIRFLOW_SEGMENTS_DATA_SUFFIX}`) ||
    String(campo?.nome || '').endsWith(` - ${AIRFLOW_SEGMENT_NOMINALS_SUFFIX}`)
  )
}

export function isAirflowComputedStorageField(campo) {
  const nome = String(campo?.nome || '')
  return (
    nome.endsWith(` - ${AIRFLOW_ACCEPTANCE_SUFFIX}`) ||
    nome.endsWith(` - ${AIRFLOW_MEASURED_FLOW_SUFFIX}`) ||
    nome.endsWith(` - ${AIRFLOW_PERCENTAGE_SUFFIX}`)
  )
}

export function parseMatrixResponseValue(value) {
  if (!value || typeof value !== 'string') {
    return null
  }

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function normalizeResponses(dados) {
  const nextState = {}

  for (const anexo of dados.anexos || []) {
    for (const secao of anexo.secoes || []) {
      for (const campo of secao.campos || []) {
        const kind = getCampoKind(campo)
        const matrixValue = isAirflowMatrixStorageField(campo) || isAirflowSegmentsStorageField(campo)
          ? parseMatrixResponseValue(campo.resposta)
          : null

        nextState[campo.id] =
          matrixValue !== null
            ? matrixValue
            : kind === 'checkbox'
              ? campo.resposta === true || campo.resposta === 'true'
              : campo.resposta ?? ''
      }
    }
  }

  return nextState
}

export function formatDateDisplayValue(value) {
  const normalizedValue = String(value || '').trim()

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalizedValue)) {
    return normalizedValue
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    const [year, month, day] = normalizedValue.split('-')
    return `${day}/${month}/${year}`
  }

  return normalizedValue
}

export function normalizeDateInputValue(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 8)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function convertDisplayDateToIso(value) {
  const normalizedValue = String(value || '').trim()

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(normalizedValue)) {
    return ''
  }

  const [day, month, year] = normalizedValue.split('/')
  return `${year}-${month}-${day}`
}

export function convertIsoDateToDisplay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim())) {
    return ''
  }

  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export function getBaseAttachmentName(nome) {
  return String(nome || '').replace(/\s-\sEquipamento\s\d+$/i, '').trim()
}

export function getAttachmentEquipmentLabel(nome) {
  const match = String(nome || '').match(/\s-\sEquipamento\s(\d+)$/i)
  return match ? `Equipamento ${match[1]}` : 'Equipamento 1'
}

export function groupAirflowFields(fields) {
  return AIRFLOW_BLOCK_LABELS.map((blockLabel) => ({
    blockLabel,
    fields: (fields || []).filter(
      (field) =>
        String(field.nome || '').startsWith(`${blockLabel} - `) &&
        !isAirflowComputedStorageField(field) &&
        !isAirflowMatrixStorageField(field) &&
        !isAirflowSegmentsStorageField(field) &&
        !isAirflowDeviationCommentField(field)
    ),
  }))
}

export function getVisibleAirflowBlocks(configuration) {
  switch (String(configuration || '').trim()) {
    case '100% ar externo - somente insuflamento':
      return ['Duto de ar de insuflamento']
    case 'Insuflamento + retorno':
      return ['Duto de ar de insuflamento', 'Duto de ar de retorno']
    case 'Insuflamento + ar externo':
      return ['Duto de ar de insuflamento', 'Duto de ar externo']
    case 'Insuflamento + retorno + ar externo':
      return AIRFLOW_BLOCK_LABELS
    default:
      return AIRFLOW_BLOCK_LABELS
  }
}

export function isAcceptanceControlledBlock(blockLabel) {
  return blockLabel === 'Duto de ar de insuflamento'
}

export function getAirflowFieldBySuffix(fields, suffix) {
  return (fields || []).find((field) => String(field.nome || '').endsWith(` - ${suffix}`))
}

export function parseDecimalValue(value) {
  const normalized = String(value || '').trim().replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateAirflowArea(width, height) {
  const largura = parseDecimalValue(width)
  const altura = parseDecimalValue(height)

  if (largura <= 0 || altura <= 0) {
    return ''
  }

  return String((largura * altura).toFixed(4)).replace('.', ',')
}

export function calculateAcceptanceRangeForArea(nominalFlow, areaValue) {
  const vazaoNominal = parseDecimalValue(nominalFlow)
  const area = parseDecimalValue(areaValue)

  if (vazaoNominal <= 0 || area <= 0) {
    return ''
  }

  const nominalVelocity = vazaoNominal / 3600 / area
  const minimum = nominalVelocity * 0.9
  const maximum = nominalVelocity * 1.1

  return `${minimum.toFixed(1).replace('.', ',')} a ${maximum.toFixed(1).replace('.', ',')} m/s`
}

export function calculateMatrixDimensions(width, height) {
  const largura = parseDecimalValue(width)
  const altura = parseDecimalValue(height)

  if (largura <= 0 || altura <= 0) {
    return null
  }

  return {
    columns: Math.max(1, Math.floor(largura / 0.1)),
    rows: Math.max(1, Math.floor(altura / 0.1)),
  }
}

export function calculateMatrixPoints(width, height) {
  const dimensions = calculateMatrixDimensions(width, height)
  return dimensions ? String(dimensions.columns * dimensions.rows) : ''
}

export function normalizeMatrixState(value, rows, columns) {
  const previousValues =
    value && typeof value === 'object' && Array.isArray(value.values) ? value.values : []

  return {
    rows,
    columns,
    values: Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: columns }, (_, columnIndex) => {
        const previousRow = previousValues[rowIndex]
        return Array.isArray(previousRow) ? previousRow[columnIndex] ?? '' : ''
      })
    ),
  }
}

export function calculateMeasuredFlow(matrixState, width, height) {
  const area = parseDecimalValue(calculateAirflowArea(width, height))

  if (!matrixState || !Array.isArray(matrixState.values) || area <= 0) {
    return ''
  }

  const flattenedValues = matrixState.values.flat().map((value) => String(value || '').trim())

  if (flattenedValues.length === 0 || flattenedValues.some((value) => value === '')) {
    return ''
  }

  const numericValues = flattenedValues.map(parseDecimalValue)

  if (numericValues.some((value) => value <= 0)) {
    return ''
  }

  const averageVelocity = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
  return String((averageVelocity * area * 3600).toFixed(1)).replace('.', ',')
}

export function calculateMeasuredFlowDeviationValue(measuredFlow, nominalFlow) {
  const measured = parseDecimalValue(measuredFlow)
  const nominal = parseDecimalValue(nominalFlow)

  if (nominal <= 0) {
    return null
  }

  return ((measured - nominal) / nominal) * 100
}

export function calculateMeasuredFlowPercentage(measuredFlow, nominalFlow) {
  const deviation = calculateMeasuredFlowDeviationValue(measuredFlow, nominalFlow)
  return deviation === null ? '' : `${deviation.toFixed(1).replace('.', ',')}%`
}

export function createEmptyAirflowSegment() {
  return {
    width: '',
    height: '',
    matrix: {
      rows: 0,
      columns: 0,
      values: [],
    },
  }
}

export function normalizeAirflowSegmentNominals(value, count, totalNominal = '') {
  const parsedValues =
    value && typeof value === 'object' && Array.isArray(value.values) ? value.values : []
  const safeCount = Math.max(1, Number(count || 1))
  const defaultSegmentNominal =
    totalNominal !== ''
      ? String((parseDecimalValue(totalNominal) / safeCount).toFixed(1)).replace('.', ',')
      : ''

  return {
    count: safeCount,
    values: Array.from({ length: safeCount }, (_, index) => parsedValues[index] ?? defaultSegmentNominal),
  }
}

export function normalizeAirflowSegmentsState(value, count, fallbackSegment = null) {
  const parsedSegments =
    value && typeof value === 'object' && Array.isArray(value.segments) ? value.segments : []
  const safeCount = Math.max(1, Number(count || 1))

  return {
    count: safeCount,
    segments: Array.from({ length: safeCount }, (_, index) => {
      const parsedSegment = parsedSegments[index]

      if (parsedSegment && typeof parsedSegment === 'object') {
        return {
          width: parsedSegment.width ?? '',
          height: parsedSegment.height ?? '',
          matrix:
            parsedSegment.matrix && typeof parsedSegment.matrix === 'object'
              ? parsedSegment.matrix
              : createEmptyAirflowSegment().matrix,
        }
      }

      if (index === 0 && fallbackSegment) {
        return fallbackSegment
      }

      return createEmptyAirflowSegment()
    }),
  }
}

export function calculateSegmentArea(segment) {
  return calculateAirflowArea(segment?.width, segment?.height)
}

export function calculateSegmentPoints(segment) {
  return calculateMatrixPoints(segment?.width, segment?.height)
}

export function calculateSegmentMeasuredFlow(segment) {
  return calculateMeasuredFlow(segment?.matrix, segment?.width, segment?.height)
}

export function calculateTotalAirflowArea(segmentsState) {
  if (!segmentsState?.segments?.length) {
    return ''
  }

  const total = segmentsState.segments.reduce(
    (sum, segment) => sum + parseDecimalValue(calculateSegmentArea(segment)),
    0
  )

  return total > 0 ? String(total.toFixed(4)).replace('.', ',') : ''
}

export function calculateTotalAirflowPoints(segmentsState) {
  if (!segmentsState?.segments?.length) {
    return ''
  }

  const total = segmentsState.segments.reduce(
    (sum, segment) => sum + Number(calculateSegmentPoints(segment) || 0),
    0
  )

  return total > 0 ? String(total) : ''
}

export function calculateTotalMeasuredFlowFromSegments(segmentsState) {
  if (!segmentsState?.segments?.length) {
    return ''
  }

  const measuredFlows = segmentsState.segments.map(calculateSegmentMeasuredFlow)

  if (measuredFlows.some((value) => String(value || '').trim() === '')) {
    return ''
  }

  const total = measuredFlows.reduce((sum, value) => sum + parseDecimalValue(value), 0)
  return total > 0 ? String(total.toFixed(1)).replace('.', ',') : ''
}
