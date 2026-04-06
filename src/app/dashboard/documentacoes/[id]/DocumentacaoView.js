'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addEquipmentToDocumentacao,
  deleteDocumentacaoAttachment,
  deleteDocumentacaoSection,
  ensureDocumentacaoSectionSupportFields,
  fetchCompatibleModelAttachmentsForDocumentacao,
  fetchCompatibleModelSectionsForAttachment,
  importModelAttachmentsToDocumentacao,
  importModelSectionsToAttachment,
  saveDocumentacaoResponses,
  syncDocumentacaoStructureToModel,
} from '@/features/documentacao/services/documentacaoReadService'
import { EmptyState, Field, PageHeader, PageShell, SurfaceCard } from '@/components/ui'
import { AppDialog, ConfirmDialog } from '@/components/AppDialog'
import {
  AIRFLOW_ACCEPTANCE_SUFFIX,
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
  calculateAcceptanceRangeForArea,
  calculateAirflowArea,
  calculateMatrixDimensions,
  calculateMatrixPoints,
  calculateMeasuredFlow,
  calculateMeasuredFlowDeviationValue,
  calculateMeasuredFlowPercentage,
  calculateSegmentArea,
  calculateSegmentMeasuredFlow,
  calculateSegmentPoints,
  calculateTotalAirflowArea,
  calculateTotalAirflowPoints,
  calculateTotalMeasuredFlowFromSegments,
  convertDisplayDateToIso,
  convertIsoDateToDisplay,
  createEmptyAirflowSegment,
  formatDateDisplayValue,
  getAirflowFieldBySuffix,
  getAttachmentEquipmentLabel,
  getBaseAttachmentName,
  getCampoKind,
  getCampoLabel,
  getVisibleAirflowBlocks,
  groupAirflowFields,
  isAcceptanceControlledBlock,
  isAirflowComputedStorageField,
  isAirflowDeviationCommentField,
  isAirflowMatrixStorageField,
  isAirflowSection,
  isAirflowSegmentsStorageField,
  isIdentificationSection,
  isInstrumentField,
  normalizeAirflowSegmentNominals,
  normalizeAirflowSegmentsState,
  normalizeDateInputValue,
  normalizeMatrixState,
  normalizeResponses,
  parseCampoOptions,
  parseDecimalValue,
} from '@/features/documentacao/utils/documentacaoViewHelpers'

function DateInputField({ fieldId, value, onChange }) {
  const hiddenDateInputRef = useRef(null)

  return (
    <div className="date-input">
      <input
        id={fieldId}
        className="input"
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={formatDateDisplayValue(value)}
        onChange={(event) => onChange(normalizeDateInputValue(event.target.value))}
      />
      <button
        type="button"
        className="date-input__button"
        aria-label="Abrir calendário"
        onClick={() => {
          const input = hiddenDateInputRef.current

          if (!input) {
            return
          }

          if (typeof input.showPicker === 'function') {
            input.showPicker()
            return
          }

          input.click()
        }}
      >
        Calendário
      </button>
      <input
        ref={hiddenDateInputRef}
        className="date-input__native"
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={convertDisplayDateToIso(value)}
        onChange={(event) => onChange(convertIsoDateToDisplay(event.target.value))}
      />
    </div>
  )
}

function serializeResposta(campo, value) {
  const kind = getCampoKind(campo)

  if (isAirflowMatrixStorageField(campo) || isAirflowSegmentsStorageField(campo)) {
    return value && typeof value === 'object' ? JSON.stringify(value) : ''
  }

  if (kind === 'checkbox') {
    return Boolean(value)
  }

  if (kind === 'date') {
    return formatDateDisplayValue(value)
  }

  if (kind === 'number') {
    return value === '' ? '' : Number(value)
  }

  return value ?? ''
}

function supportsOutletSumMethod(blockLabel) {
  return blockLabel === 'Duto de ar de insuflamento' || blockLabel === 'Duto de ar de retorno'
}

export default function DocumentacaoView({ dados, onRefresh }) {
  const router = useRouter()
  const [savingSectionId, setSavingSectionId] = useState(null)
  const [feedback, setFeedback] = useState({ error: '', success: '' })
  const [responses, setResponses] = useState(() => normalizeResponses(dados))
  const [sectionImportDialog, setSectionImportDialog] = useState({ open: false, anexo: null })
  const [sectionImportOptions, setSectionImportOptions] = useState([])
  const [selectedSectionImportNames, setSelectedSectionImportNames] = useState([])
  const [loadingSectionImportOptions, setLoadingSectionImportOptions] = useState(false)
  const [importingSections, setImportingSections] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importingModelAttachments, setImportingModelAttachments] = useState(false)
  const [loadingImportOptions, setLoadingImportOptions] = useState(false)
  const [importOptions, setImportOptions] = useState([])
  const [selectedImportNames, setSelectedImportNames] = useState([])
  const [selectedImportSections, setSelectedImportSections] = useState({})
  const [collapsedAnexoIds, setCollapsedAnexoIds] = useState([])
  const [collapsedGroupNames, setCollapsedGroupNames] = useState([])
  const [collapsedSectionIds, setCollapsedSectionIds] = useState([])
  const [collapsedAirflowBlockKeys, setCollapsedAirflowBlockKeys] = useState([])
  const [deleteAnexoDialog, setDeleteAnexoDialog] = useState({ open: false, anexo: null })
  const [deletingAnexoId, setDeletingAnexoId] = useState(null)
  const [deleteSectionDialog, setDeleteSectionDialog] = useState({ open: false, secao: null })
  const [deletingSectionId, setDeletingSectionId] = useState(null)
  const [addingEquipment, setAddingEquipment] = useState(false)
  const [syncModelDialogOpen, setSyncModelDialogOpen] = useState(false)
  const [syncingModel, setSyncingModel] = useState(false)

  useEffect(() => {
    setResponses(normalizeResponses(dados))
  }, [dados])

  const totalCampos = useMemo(
    () =>
      (dados.anexos || []).reduce(
        (sum, anexo) =>
          sum +
          (anexo.secoes || []).reduce(
            (sectionSum, secao) => sectionSum + (secao.campos?.length || 0),
            0
          ),
        0
      ),
    [dados]
  )
  const isOQDocument = String(dados.documentacao.tipo || '').toUpperCase().includes('OQ')
  const attachmentGroups = useMemo(() => {
    const grouped = new Map()

    for (const anexo of dados.anexos || []) {
      const baseName = getBaseAttachmentName(anexo.nome)

      if (!grouped.has(baseName)) {
        grouped.set(baseName, [])
      }

      grouped.get(baseName).push(anexo)
    }

    return Array.from(grouped.entries()).map(([baseName, attachments]) => ({
      baseName,
      attachments,
    }))
  }, [dados.anexos])

  async function reloadDocumentacao() {
    setFeedback({ error: '', success: '' })
    await onRefresh()
  }

  async function abrirDialogImportacao() {
    try {
      setLoadingImportOptions(true)
      setFeedback({ error: '', success: '' })
      const attachments = await fetchCompatibleModelAttachmentsForDocumentacao({
        documentacaoId: dados.documentacao.id,
      })
      setImportOptions(attachments)
      setSelectedImportNames(
        attachments.filter((attachment) => !attachment.alreadyImported).map((attachment) => attachment.nome)
      )
      setSelectedImportSections(
        attachments.reduce((acc, attachment) => {
          acc[attachment.nome] = (attachment.sections || []).map((section) => section.nome)
          return acc
        }, {})
      )
      setImportDialogOpen(true)
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel carregar os anexos compatíveis do modelo.',
        success: '',
      })
    } finally {
      setLoadingImportOptions(false)
    }
  }

  async function importarAnexosDoModelo() {
    try {
      setImportingModelAttachments(true)
      setFeedback({ error: '', success: '' })

      const result = await importModelAttachmentsToDocumentacao({
        documentacaoId: dados.documentacao.id,
        attachmentNames: selectedImportNames,
        selectedSectionsByAttachmentName: selectedImportSections,
      })

      await reloadDocumentacao()
      setFeedback({
        error: '',
        success:
          result.imported > 0
            ? `${result.imported} anexo(s) do modelo importado(s) com sucesso.`
            : 'Todos os anexos do modelo já estavam presentes nesta documentação.',
      })
      setImportDialogOpen(false)
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel importar os anexos do modelo.',
        success: '',
      })
    } finally {
      setImportingModelAttachments(false)
    }
  }

  async function excluirAnexo() {
    const anexo = deleteAnexoDialog.anexo

    if (!anexo) {
      return
    }

    try {
      setDeletingAnexoId(anexo.id)
      setFeedback({ error: '', success: '' })
      await deleteDocumentacaoAttachment(anexo.id)
      await reloadDocumentacao()
      setFeedback({ error: '', success: 'Anexo excluído com sucesso.' })
      setDeleteAnexoDialog({ open: false, anexo: null })
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel excluir o anexo.',
        success: '',
      })
    } finally {
      setDeletingAnexoId(null)
    }
  }

  async function excluirSecao() {
    const secao = deleteSectionDialog.secao

    if (!secao) {
      return
    }

    try {
      setDeletingSectionId(secao.id)
      setFeedback({ error: '', success: '' })
      await deleteDocumentacaoSection(secao.id)
      await reloadDocumentacao()
      setFeedback({ error: '', success: 'Seção excluída com sucesso.' })
      setDeleteSectionDialog({ open: false, secao: null })
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel excluir a seção.',
        success: '',
      })
    } finally {
      setDeletingSectionId(null)
    }
  }

  async function adicionarEquipamento() {
    try {
      setAddingEquipment(true)
      setFeedback({ error: '', success: '' })
      const result = await addEquipmentToDocumentacao(dados.documentacao.id)
      await reloadDocumentacao()
      setFeedback({
        error: '',
        success: `Equipamento ${result.equipmentNumber} adicionado com sucesso.`,
      })
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel adicionar o equipamento.',
        success: '',
      })
    } finally {
      setAddingEquipment(false)
    }
  }

  async function atualizarModeloAPartirDaDocumentacao() {
    try {
      setSyncingModel(true)
      setFeedback({ error: '', success: '' })
      const result = await syncDocumentacaoStructureToModel({
        documentacaoId: dados.documentacao.id,
      })
      setFeedback({
        error: '',
        success: `${result.syncedAttachments} anexo(s) do modelo sincronizado(s) com a documentação atual.`,
      })
      setSyncModelDialogOpen(false)
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel atualizar o modelo a partir da documentação.',
        success: '',
      })
    } finally {
      setSyncingModel(false)
    }
  }

  function toggleAnexoCollapsed(anexoId) {
    setCollapsedAnexoIds((current) =>
      current.includes(anexoId)
        ? current.filter((id) => id !== anexoId)
        : [...current, anexoId]
    )
  }

  function toggleGroupCollapsed(groupName) {
    setCollapsedGroupNames((current) =>
      current.includes(groupName)
        ? current.filter((name) => name !== groupName)
        : [...current, groupName]
    )
  }

  function toggleSectionCollapsed(secaoId) {
    setCollapsedSectionIds((current) =>
      current.includes(secaoId)
        ? current.filter((id) => id !== secaoId)
        : [...current, secaoId]
    )
  }

  function toggleAirflowBlockCollapsed(blockKey) {
    setCollapsedAirflowBlockKeys((current) =>
      current.includes(blockKey)
        ? current.filter((key) => key !== blockKey)
        : [...current, blockKey]
    )
  }

  async function abrirDialogImportacaoSecao(anexo) {
    try {
      setLoadingSectionImportOptions(true)
      setFeedback({ error: '', success: '' })
      const sections = await fetchCompatibleModelSectionsForAttachment({
        anexoId: anexo.id,
      })
      setSectionImportOptions(sections)
      setSelectedSectionImportNames(
        sections.filter((section) => !section.alreadyImported).map((section) => section.nome)
      )
      setSectionImportDialog({ open: true, anexo })
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel carregar as seções compatíveis do modelo.',
        success: '',
      })
    } finally {
      setLoadingSectionImportOptions(false)
    }
  }

  async function importarSecoesDoModelo() {
    const anexo = sectionImportDialog.anexo

    if (!anexo) {
      return
    }

    try {
      setImportingSections(true)
      setFeedback({ error: '', success: '' })
      const result = await importModelSectionsToAttachment({
        anexoId: anexo.id,
        sectionNames: selectedSectionImportNames,
      })
      await reloadDocumentacao()
      setFeedback({
        error: '',
        success:
          result.imported > 0
            ? `${result.imported} seção(ões) do modelo importada(s) com sucesso.`
            : 'Todas as seções compatíveis do modelo já estavam presentes neste anexo.',
      })
      setSectionImportDialog({ open: false, anexo: null })
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel importar as seções do modelo.',
        success: '',
      })
    } finally {
      setImportingSections(false)
    }
  }

  async function salvarSecao(secao) {
    try {
      setSavingSectionId(secao.id)
      setFeedback({ error: '', success: '' })
      const ensuredCampos = await ensureDocumentacaoSectionSupportFields(secao.id, secao.nome, secao.campos || [])
      const responseValueByName = new Map((secao.campos || []).map((campo) => [campo.nome, responses[campo.id]]))
      const nextResponses = ensuredCampos.reduce(
        (acc, campo) => {
          if (responseValueByName.has(campo.nome)) {
            acc[campo.id] = responseValueByName.get(campo.nome)
          }
          return acc
        },
        { ...responses }
      )
      const preparedSecao = {
        ...secao,
        campos: ensuredCampos,
      }

      await saveDocumentacaoResponses({
        documentacaoId: dados.documentacao.id,
        respostas: ensuredCampos.map((campo) => ({
          anexoId: preparedSecao.anexo_id,
          secaoId: preparedSecao.id,
          campoId: campo.id,
          value: serializeResposta(campo, getEffectiveFieldValue(campo, preparedSecao, nextResponses)),
        })),
      })

      setResponses(nextResponses)
      await reloadDocumentacao()
      setFeedback({ error: '', success: 'Respostas salvas com sucesso.' })
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel salvar as respostas.',
        success: '',
      })
    } finally {
      setSavingSectionId(null)
    }
  }

  function renderFieldInput(campo) {
    const kind = getCampoKind(campo)
    const options = parseCampoOptions(campo)
    const fieldId = `campo-${campo.id}`
    const value = responses[campo.id]

    if (kind === 'textarea') {
      return (
        <textarea
          id={fieldId}
          className="textarea"
          value={String(value ?? '')}
          onChange={(event) =>
            setResponses((current) => ({
              ...current,
              [campo.id]: event.target.value,
            }))
          }
        />
      )
    }

    if (kind === 'select') {
      return (
        <select
          id={fieldId}
          className="input"
          value={String(value ?? '')}
          onChange={(event) =>
            setResponses((current) => ({
              ...current,
              [campo.id]: event.target.value,
            }))
          }
        >
          <option value="">Selecione</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }

    if (kind === 'checkbox') {
      return (
        <label className="checkbox-field" htmlFor={fieldId}>
          <input
            id={fieldId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) =>
              setResponses((current) => ({
                ...current,
                [campo.id]: event.target.checked,
              }))
            }
          />
          <span>Marcar resposta</span>
        </label>
      )
    }

    return (
      kind === 'date' ? (
        <DateInputField
          fieldId={fieldId}
          value={value}
          onChange={(nextValue) =>
            setResponses((current) => ({
              ...current,
              [campo.id]: nextValue,
            }))
          }
        />
      ) : (
        <input
          id={fieldId}
          className="input"
          type={kind}
          value={String(value ?? '')}
          onChange={(event) =>
            setResponses((current) => ({
              ...current,
              [campo.id]: event.target.value,
            }))
          }
        />
      )
    )
  }

  function getEffectiveFieldValue(campo, secao, responseState = responses) {
    if (!isAirflowSection(secao)) {
      return responseState[campo.id]
    }

    const [blockLabel = '', suffix = ''] = String(campo.nome || '').split(' - ')
    const blockFields = (secao.campos || []).filter((field) =>
      String(field.nome || '').startsWith(`${blockLabel} - `)
    )
    const methodField = (secao.campos || []).find(
      (field) => String(field.nome || '') === `${blockLabel} - ${AIRFLOW_METHOD_SUFFIX}`
    )
    const segmentCountField = (secao.campos || []).find(
      (field) => String(field.nome || '') === `${blockLabel} - ${AIRFLOW_SEGMENT_COUNT_SUFFIX}`
    )
    const segmentsDataField = (secao.campos || []).find(
      (field) => String(field.nome || '') === `${blockLabel} - ${AIRFLOW_SEGMENTS_DATA_SUFFIX}`
    )
    const segmentNominalsField = (secao.campos || []).find(
      (field) => String(field.nome || '') === `${blockLabel} - ${AIRFLOW_SEGMENT_NOMINALS_SUFFIX}`
    )
    const outletSumField = getAirflowFieldBySuffix(blockFields, AIRFLOW_OUTLET_SUM_SUFFIX)
    const widthField = getAirflowFieldBySuffix(blockFields, 'Largura')
    const heightField = getAirflowFieldBySuffix(blockFields, 'Altura')
    const nominalField = getAirflowFieldBySuffix(blockFields, 'Vazão nominal')
    const matrixStorageField = (secao.campos || []).find(
      (field) => String(field.nome || '') === `${blockLabel} - ${AIRFLOW_MATRIX_STORAGE_SUFFIX}`
    )
    const methodValue = methodField ? responseState[methodField.id] || 'Tubo de Pitot' : 'Tubo de Pitot'
    const usingOutletSum = methodValue === 'Somatório de bocas'
    const widthValue = widthField ? responseState[widthField.id] : ''
    const heightValue = heightField ? responseState[heightField.id] : ''
    const nominalValue = nominalField ? responseState[nominalField.id] : ''
    const outletSumValue = outletSumField ? responseState[outletSumField.id] : ''
    const segmentCount = Math.max(1, Number(segmentCountField ? responseState[segmentCountField.id] || 1 : 1))
    const fallbackFirstSegment = {
      width: widthValue,
      height: heightValue,
      matrix:
        matrixStorageField &&
        responseState[matrixStorageField.id] &&
        typeof responseState[matrixStorageField.id] === 'object'
          ? responseState[matrixStorageField.id]
          : createEmptyAirflowSegment().matrix,
    }
    const segmentsState = normalizeAirflowSegmentsState(
      segmentsDataField ? responseState[segmentsDataField.id] : null,
      segmentCount,
      fallbackFirstSegment
    )
    const segmentNominalsState = normalizeAirflowSegmentNominals(
      segmentNominalsField ? responseState[segmentNominalsField.id] : null,
      segmentCount,
      nominalValue
    )

    if (suffix === 'Área') {
      if (usingOutletSum) {
        return ''
      }
      return calculateTotalAirflowArea(segmentsState)
    }

    if (suffix === 'Pontos de matriz') {
      if (usingOutletSum) {
        return ''
      }
      return calculateTotalAirflowPoints(segmentsState)
    }

    if (suffix === AIRFLOW_ACCEPTANCE_SUFFIX) {
      if (usingOutletSum) {
        return ''
      }
      return calculateAcceptanceRangeForArea(nominalValue, calculateTotalAirflowArea(segmentsState))
    }

    if (suffix === AIRFLOW_MATRIX_STORAGE_SUFFIX) {
      return segmentsState.segments[0]?.matrix || createEmptyAirflowSegment().matrix
    }

    if (suffix === AIRFLOW_SEGMENTS_DATA_SUFFIX) {
      return segmentsState
    }

    if (suffix === AIRFLOW_SEGMENT_NOMINALS_SUFFIX) {
      return segmentNominalsState
    }

    if (suffix === AIRFLOW_SEGMENT_COUNT_SUFFIX) {
      return String(segmentCount)
    }

    if (suffix === AIRFLOW_MEASURED_FLOW_SUFFIX) {
      if (usingOutletSum) {
        return outletSumValue
      }
      return calculateTotalMeasuredFlowFromSegments(segmentsState)
    }

    if (suffix === AIRFLOW_PERCENTAGE_SUFFIX) {
      const measuredField = (secao.campos || []).find(
        (field) => String(field.nome || '') === `${blockLabel} - ${AIRFLOW_MEASURED_FLOW_SUFFIX}`
      )
      const measuredValue = measuredField ? getEffectiveFieldValue(measuredField, secao, responseState) : ''
      return calculateMeasuredFlowPercentage(measuredValue, nominalValue)
    }

    if (suffix === AIRFLOW_OUTLET_SUM_SUFFIX && !usingOutletSum) {
      return responseState[campo.id]
    }

    if (suffix === AIRFLOW_OUTLET_SUM_SUFFIX) {
      return outletSumValue
    }

    return responseState[campo.id]
  }

  function renderAirflowSection(secao) {
    const configurationField = (secao.campos || []).find(
      (campo) => String(campo.nome || '') === AIRFLOW_CONFIGURATION_FIELD
    )
    const selectedConfiguration = configurationField ? responses[configurationField.id] : ''
    const visibleBlocks = getVisibleAirflowBlocks(selectedConfiguration)

    return (
      <div className="stack">
        {configurationField ? (
          <SurfaceCard>
            <div className="form-grid form-grid--single">
              <Field
                label="Situação do equipamento"
                hint="Escolha quais dutos devem ser preenchidos neste equipamento."
              >
                {renderFieldInput(configurationField)}
              </Field>
            </div>
          </SurfaceCard>
        ) : null}

        {groupAirflowFields(secao.campos)
          .filter((block) => visibleBlocks.includes(block.blockLabel))
          .map((block) => {
          const blockKey = `${secao.id}:${block.blockLabel}`
          const isBlockCollapsed = collapsedAirflowBlockKeys.includes(blockKey)
          const nominalField = getAirflowFieldBySuffix(block.fields, 'Vazão nominal')
          const methodField = (secao.campos || []).find(
            (field) => String(field.nome || '') === `${block.blockLabel} - ${AIRFLOW_METHOD_SUFFIX}`
          )
          const segmentCountField = (secao.campos || []).find(
            (field) => String(field.nome || '') === `${block.blockLabel} - ${AIRFLOW_SEGMENT_COUNT_SUFFIX}`
          )
          const segmentsDataField = (secao.campos || []).find(
            (field) => String(field.nome || '') === `${block.blockLabel} - ${AIRFLOW_SEGMENTS_DATA_SUFFIX}`
          )
          const segmentNominalsField = (secao.campos || []).find(
            (field) => String(field.nome || '') === `${block.blockLabel} - ${AIRFLOW_SEGMENT_NOMINALS_SUFFIX}`
          )
          const widthField = getAirflowFieldBySuffix(block.fields, 'Largura')
          const heightField = getAirflowFieldBySuffix(block.fields, 'Altura')
          const areaField = getAirflowFieldBySuffix(block.fields, 'Área')
          const matrixField = getAirflowFieldBySuffix(block.fields, 'Pontos de matriz')
          const outletSumField = getAirflowFieldBySuffix(block.fields, AIRFLOW_OUTLET_SUM_SUFFIX)
          const matrixStorageField = (secao.campos || []).find(
            (field) => String(field.nome || '') === `${block.blockLabel} - ${AIRFLOW_MATRIX_STORAGE_SUFFIX}`
          )
          const deviationCommentField = (secao.campos || []).find(
            (field) => String(field.nome || '') === `${block.blockLabel} - ${AIRFLOW_DEVIATION_COMMENT_SUFFIX}`
          )
          const selectedMethod = methodField ? responses[methodField.id] || 'Tubo de Pitot' : 'Tubo de Pitot'
          const usingOutletSum = selectedMethod === 'Somatório de bocas'
          const segmentCount = Math.max(1, Number(segmentCountField ? responses[segmentCountField.id] || 1 : 1))
          const pitotSegmentsState = segmentsDataField
            ? getEffectiveFieldValue(segmentsDataField, secao)
            : normalizeAirflowSegmentsState(null, segmentCount)
          const segmentNominalsState = segmentNominalsField
            ? getEffectiveFieldValue(segmentNominalsField, secao)
            : normalizeAirflowSegmentNominals(null, segmentCount, responses[nominalField?.id] ?? '')
          const measuredFlow =
            usingOutletSum
              ? outletSumField
                ? String(responses[outletSumField.id] ?? '')
                : ''
              : calculateTotalMeasuredFlowFromSegments(pitotSegmentsState)
          const acceptanceField = (secao.campos || []).find(
            (field) => String(field.nome || '') === `${block.blockLabel} - ${AIRFLOW_ACCEPTANCE_SUFFIX}`
          )
          const measuredFlowPercentage =
            measuredFlow && nominalField
              ? calculateMeasuredFlowPercentage(measuredFlow, responses[nominalField.id])
              : ''
          const measuredFlowDeviation =
            measuredFlow && nominalField
              ? calculateMeasuredFlowDeviationValue(measuredFlow, responses[nominalField.id])
              : null
          const hasAcceptanceCriteria = isAcceptanceControlledBlock(block.blockLabel)
          const requiresDeviationComment =
            hasAcceptanceCriteria && measuredFlowDeviation !== null && Math.abs(measuredFlowDeviation) > 10
          const isWithinAcceptance =
            hasAcceptanceCriteria && measuredFlowDeviation !== null && Math.abs(measuredFlowDeviation) <= 10

          return (
            <SurfaceCard key={block.blockLabel}>
              <div className="surface-card__header">
                <div>
                  <h4 className="surface-card__title">{block.blockLabel}</h4>
                  <p className="surface-card__subtitle">
                    {usingOutletSum
                      ? 'Use o somatório de bocas quando não houver trecho de pitot disponível.'
                      : 'Área e pontos de matriz são calculados automaticamente pela largura e altura.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => toggleAirflowBlockCollapsed(blockKey)}
                >
                  {isBlockCollapsed ? 'Expandir' : 'Recolher'}
                </button>
              </div>

              {isBlockCollapsed ? null : (
              <div className="stack">
                {methodField && supportsOutletSumMethod(block.blockLabel) ? (
                  <div className="form-grid form-grid--single">
                    <Field
                      label="Método de medição"
                      hint="Escolha entre Tubo de Pitot e Somatório de bocas."
                    >
                      <select
                        id={`campo-${methodField.id}`}
                        className="input"
                        value={String(responses[methodField.id] ?? 'Tubo de Pitot')}
                        onChange={(event) =>
                          setResponses((current) => ({
                            ...current,
                            [methodField.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione</option>
                        <option value="Tubo de Pitot">Tubo de Pitot</option>
                        <option value="Somatório de bocas">Somatório de bocas</option>
                      </select>
                    </Field>
                  </div>
                ) : null}

                {usingOutletSum ? (
                  <div className="form-grid form-grid--airflow-summary">
                    {nominalField ? (
                      <Field label={nominalField.label || 'Vazão nominal (m³/h)'}>
                        {renderFieldInput(nominalField)}
                      </Field>
                    ) : null}
                    {outletSumField ? (
                      <Field label={outletSumField.label || 'Somatório de bocas (m³/h)'}>
                        <input
                          id={`campo-${outletSumField.id}`}
                          className="input"
                          type="number"
                          value={String(responses[outletSumField.id] ?? '')}
                          onChange={(event) =>
                            setResponses((current) => ({
                              ...current,
                              [outletSumField.id]: event.target.value,
                            }))
                          }
                        />
                      </Field>
                    ) : null}
                    <Field
                      label={hasAcceptanceCriteria ? 'Desvio' : 'Desvio (informativo)'}
                      hint={
                        hasAcceptanceCriteria
                          ? 'Desvio percentual da medição em relação à vazão nominal.'
                          : 'Desvio percentual apenas informativo para este tipo de duto.'
                      }
                    >
                      <input
                        className={`input${
                          hasAcceptanceCriteria && requiresDeviationComment
                            ? ' input--error'
                            : hasAcceptanceCriteria && isWithinAcceptance
                              ? ' input--success'
                              : ''
                        }`}
                        readOnly
                        value={measuredFlowPercentage}
                      />
                    </Field>
                  </div>
                ) : (
                  <>
                <div className="form-grid form-grid--airflow-summary">
                  {nominalField ? (
                    <Field label={nominalField.label || 'Vazão nominal (m³/h)'}>
                      {renderFieldInput(nominalField)}
                    </Field>
                  ) : null}
                  {segmentCountField ? (
                    <Field label="Quantidade de trechos de Pitot">
                      <input
                        id={`campo-${segmentCountField.id}`}
                        className="input"
                        type="number"
                        min="1"
                        max="6"
                        value={String(segmentCount)}
                        onChange={(event) =>
                          setResponses((current) => {
                            const nextCount = Math.max(1, Math.min(6, Number(event.target.value || 1)))
                            const nextState = {
                              ...current,
                              [segmentCountField.id]: String(nextCount),
                            }

                            if (segmentsDataField) {
                              const currentSegments = normalizeAirflowSegmentsState(
                                current[segmentsDataField.id],
                                nextCount
                              )
                              nextState[segmentsDataField.id] = currentSegments

                              if (widthField) {
                                nextState[widthField.id] = currentSegments.segments[0]?.width ?? ''
                              }

                              if (heightField) {
                                nextState[heightField.id] = currentSegments.segments[0]?.height ?? ''
                              }

                              if (matrixStorageField) {
                                nextState[matrixStorageField.id] =
                                  currentSegments.segments[0]?.matrix ?? createEmptyAirflowSegment().matrix
                              }
                            }

                            return nextState
                          })
                        }
                      />
                    </Field>
                  ) : null}
                </div>

                {pitotSegmentsState.segments.map((segment, segmentIndex) => {
                  const dimensions = calculateMatrixDimensions(segment.width, segment.height)
                  const segmentArea = calculateSegmentArea(segment)
                  const segmentPoints = calculateSegmentPoints(segment)
                  const segmentMeasuredFlow = calculateSegmentMeasuredFlow(segment)
                  const segmentNominal = segmentNominalsState.values[segmentIndex] ?? ''
                  const segmentAcceptanceRange = calculateAcceptanceRangeForArea(
                    segmentNominal,
                    segmentArea
                  )

                  return (
                    <SurfaceCard key={`${block.blockLabel}:trecho:${segmentIndex + 1}`}>
                      <div className="surface-card__header">
                        <div>
                          <h5 className="surface-card__title">Trecho {segmentIndex + 1}</h5>
                          <p className="surface-card__subtitle">
                            Informe as dimensões e as leituras da matriz deste trecho.
                          </p>
                        </div>
                      </div>

                      <div className="form-grid form-grid--airflow-summary">
                        <Field label="Vazão nominal do trecho">
                          <input
                            className="input"
                            type="number"
                            value={String(segmentNominal ?? '')}
                            onChange={(event) =>
                              segmentNominalsField
                                ? setResponses((current) => {
                                    const nextNominals = normalizeAirflowSegmentNominals(
                                      current[segmentNominalsField.id],
                                      segmentCount,
                                      current[nominalField?.id] ?? ''
                                    )
                                    nextNominals.values[segmentIndex] = event.target.value

                                    return {
                                      ...current,
                                      [segmentNominalsField.id]: nextNominals,
                                    }
                                  })
                                : undefined
                            }
                          />
                        </Field>
                        <Field label="Largura (m)">
                          <input
                            className="input"
                            type="number"
                            value={String(segment.width ?? '')}
                            onChange={(event) =>
                              setResponses((current) => {
                                const nextSegments = normalizeAirflowSegmentsState(
                                  current[segmentsDataField.id],
                                  segmentCount
                                )
                                nextSegments.segments[segmentIndex].width = event.target.value
                                const nextState = {
                                  ...current,
                                  [segmentsDataField.id]: nextSegments,
                                }

                                if (segmentIndex === 0 && widthField) {
                                  nextState[widthField.id] = event.target.value
                                }

                                return nextState
                              })
                            }
                          />
                        </Field>
                        <Field label="Altura (m)">
                          <input
                            className="input"
                            type="number"
                            value={String(segment.height ?? '')}
                            onChange={(event) =>
                              setResponses((current) => {
                                const nextSegments = normalizeAirflowSegmentsState(
                                  current[segmentsDataField.id],
                                  segmentCount
                                )
                                nextSegments.segments[segmentIndex].height = event.target.value
                                const nextState = {
                                  ...current,
                                  [segmentsDataField.id]: nextSegments,
                                }

                                if (segmentIndex === 0 && heightField) {
                                  nextState[heightField.id] = event.target.value
                                }

                                return nextState
                              })
                            }
                          />
                        </Field>
                      </div>

                      <div className="form-grid form-grid--airflow-summary">
                        <Field label="Área (m²)">
                          <input className="input" readOnly value={segmentArea} />
                        </Field>
                        <Field label="Pontos de matriz">
                          <input className="input" readOnly value={segmentPoints} />
                        </Field>
                        <Field label="Vazão medida do trecho">
                          <input
                            className="input"
                            readOnly
                            value={segmentMeasuredFlow ? `${segmentMeasuredFlow} m³/h` : ''}
                          />
                        </Field>
                      </div>

                      <div className="form-grid form-grid--single">
                        <Field
                          label={hasAcceptanceCriteria ? 'Critério de aceitação por ponto do trecho' : 'Faixa informativa por ponto do trecho'}
                          hint={
                            hasAcceptanceCriteria
                              ? 'Baseado na vazão nominal do trecho e na área deste trecho.'
                              : 'Faixa apenas informativa para este tipo de duto.'
                          }
                        >
                          <input className="input" readOnly value={segmentAcceptanceRange} />
                        </Field>
                      </div>

                      {dimensions ? (
                        <div className="stack">
                          <div>
                            <strong>Matriz de medições</strong>
                            <p className="muted">
                              Preencha os {dimensions.rows} x {dimensions.columns} pontos deste trecho.
                            </p>
                          </div>

                          <div
                            className="matrix-grid"
                            style={{ gridTemplateColumns: `repeat(${dimensions.columns}, minmax(88px, 1fr))` }}
                          >
                            {normalizeMatrixState(segment.matrix, dimensions.rows, dimensions.columns).values.map(
                              (row, rowIndex) =>
                                row.map((cellValue, columnIndex) => (
                                  <label
                                    key={`${block.blockLabel}:${segmentIndex}:${rowIndex}:${columnIndex}`}
                                    className="matrix-grid__cell"
                                  >
                                    <input
                                      className="input"
                                      type="number"
                                      value={cellValue}
                                      onChange={(event) =>
                                        setResponses((current) => {
                                          const nextSegments = normalizeAirflowSegmentsState(
                                            current[segmentsDataField.id],
                                            segmentCount
                                          )
                                          const nextMatrix = normalizeMatrixState(
                                            nextSegments.segments[segmentIndex].matrix,
                                            dimensions.rows,
                                            dimensions.columns
                                          )
                                          nextMatrix.values[rowIndex][columnIndex] = event.target.value
                                          nextSegments.segments[segmentIndex].matrix = nextMatrix

                                          const nextState = {
                                            ...current,
                                            [segmentsDataField.id]: nextSegments,
                                          }

                                          if (segmentIndex === 0 && matrixStorageField) {
                                            nextState[matrixStorageField.id] = nextMatrix
                                          }

                                          return nextState
                                        })
                                      }
                                    />
                                  </label>
                                ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </SurfaceCard>
                  )
                })}

                  </>
                )}

                <div className="form-grid form-grid--halves">
                  <Field
                    label="Vazão medida"
                    hint={
                      usingOutletSum
                        ? 'Obtida pelo somatório de bocas.'
                        : 'Calculada pela soma das vazões medidas de todos os trechos.'
                    }
                  >
                    <input
                      className="input"
                      readOnly
                      value={measuredFlow ? `${measuredFlow} m³/h` : ''}
                    />
                  </Field>

                  <Field
                    label={
                      hasAcceptanceCriteria
                        ? '% em relação à vazão nominal'
                        : '% em relação à vazão nominal (informativo)'
                    }
                    hint={
                      hasAcceptanceCriteria
                        ? 'Percentual da vazão medida comparado com a vazão nominal informada.'
                        : 'Percentual apenas informativo para este tipo de duto.'
                    }
                  >
                    <input
                      className={`input${
                        hasAcceptanceCriteria && requiresDeviationComment
                          ? ' input--error'
                          : hasAcceptanceCriteria && isWithinAcceptance
                            ? ' input--success'
                            : ''
                      }`}
                      readOnly
                      value={measuredFlowPercentage}
                    />
                  </Field>
                </div>

                {requiresDeviationComment && deviationCommentField ? (
                  <Field
                    label="Comentários do desvio"
                    hint="Explique o motivo do desvio fora do critério de ±10%."
                  >
                    <textarea
                      className="textarea"
                      value={String(responses[deviationCommentField.id] ?? '')}
                      onChange={(event) =>
                        setResponses((current) => ({
                          ...current,
                          [deviationCommentField.id]: event.target.value,
                        }))
                      }
                    />
                  </Field>
                ) : null}
              </div>
              )}
            </SurfaceCard>
          )
        })}
      </div>
    )
  }

  function renderSectionFields(secao) {
    const fields = secao.campos || []

    if (fields.length === 0) {
      return <p className="muted">Nenhum campo nesta seção.</p>
    }

    if (isAirflowSection(secao)) {
      return renderAirflowSection(secao)
    }

    if (!isIdentificationSection(secao)) {
      return (
        <div className="form-grid form-grid--single">
          {fields.map((campo) => (
            <Field
              key={campo.id}
              label={getCampoLabel(campo)}
              hint={campo.tipo ? `Tipo: ${campo.tipo}` : undefined}
            >
              {renderFieldInput(campo)}
            </Field>
          ))}
        </div>
      )
    }

    const instrumentFields = fields.filter(isInstrumentField)
    const regularFields = fields.filter((campo) => !isInstrumentField(campo))

    return (
      <div className="stack">
        {regularFields.length > 0 ? (
          <div className="form-grid">
            {regularFields.map((campo) => (
              <Field
                key={campo.id}
                label={getCampoLabel(campo)}
                hint={campo.tipo ? `Tipo: ${campo.tipo}` : undefined}
              >
                {renderFieldInput(campo)}
              </Field>
            ))}
          </div>
        ) : null}

        {instrumentFields.length > 0 ? (
          <SurfaceCard>
            <div className="surface-card__header">
              <div>
                <h4 className="surface-card__title">Instrumentos utilizados</h4>
                <p className="surface-card__subtitle">
                  Informe o número de série dos instrumentos utilizados nesta inspeção.
                </p>
              </div>
            </div>

            <div className="form-grid form-grid--single">
              {instrumentFields.map((campo) => (
                <Field
                  key={campo.id}
                  label="Nº de série"
                  hint={campo.nome}
                >
                  {renderFieldInput(campo)}
                </Field>
              ))}
            </div>
          </SurfaceCard>
        ) : null}
      </div>
    )
  }

  return (
    <PageShell>
      <ConfirmDialog
        open={deleteAnexoDialog.open}
        title="Excluir anexo"
        description={
          deleteAnexoDialog.anexo
            ? `O anexo "${deleteAnexoDialog.anexo.nome}" e suas seções serão removidos desta documentação.`
            : ''
        }
        confirmLabel="Excluir anexo"
        busy={Boolean(deletingAnexoId)}
        onClose={() => setDeleteAnexoDialog({ open: false, anexo: null })}
        onConfirm={excluirAnexo}
      />

      <ConfirmDialog
        open={deleteSectionDialog.open}
        title="Excluir seção"
        description={
          deleteSectionDialog.secao
            ? `A seção "${deleteSectionDialog.secao.nome}" e seus campos serão removidos deste anexo.`
            : ''
        }
        confirmLabel="Excluir seção"
        busy={Boolean(deletingSectionId)}
        onClose={() => setDeleteSectionDialog({ open: false, secao: null })}
        onConfirm={excluirSecao}
      />

      <ConfirmDialog
        open={syncModelDialogOpen}
        title="Atualizar modelo"
        description="A estrutura atual desta documentação substituirá o modelo compatível para as próximas OS."
        confirmLabel="Atualizar modelo"
        busy={syncingModel}
        onClose={() => setSyncModelDialogOpen(false)}
        onConfirm={atualizarModeloAPartirDaDocumentacao}
      />

      <AppDialog
        open={importDialogOpen}
        title="Importar anexos do modelo"
        description="Escolha quais anexos do modelo compatível devem ser criados nesta documentação."
        onClose={importingModelAttachments ? undefined : () => setImportDialogOpen(false)}
        actions={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setImportDialogOpen(false)}
              disabled={importingModelAttachments}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={importarAnexosDoModelo}
              disabled={importingModelAttachments || selectedImportNames.length === 0}
            >
              {importingModelAttachments ? 'Importando...' : 'Importar selecionados'}
            </button>
          </>
        }
      >
        {loadingImportOptions ? (
          <p className="muted">Carregando anexos compatíveis...</p>
        ) : importOptions.length === 0 ? (
          <p className="muted">Nenhum anexo compatível foi encontrado no modelo.</p>
        ) : (
          <div className="stack">
            {importOptions.map((attachment) => {
              const checked = selectedImportNames.includes(attachment.nome)
              const selectedSections = selectedImportSections[attachment.nome] || []

              return (
                <div key={attachment.nome} className="stack">
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={attachment.alreadyImported || importingModelAttachments}
                      onChange={(event) => {
                        setSelectedImportNames((current) =>
                          event.target.checked
                            ? [...current, attachment.nome]
                            : current.filter((name) => name !== attachment.nome)
                        )
                      }}
                    />
                    <span>
                      {attachment.nome}
                      {attachment.alreadyImported ? ' (já importado)' : ''}
                    </span>
                  </label>

                  {checked && !attachment.alreadyImported && attachment.sections?.length ? (
                    <div className="section-panel">
                      <div>
                        <strong>Seções do anexo</strong>
                        <p className="muted">
                          Escolha quais seções deste anexo devem ser criadas para esta documentação.
                        </p>
                      </div>
                      <div className="stack">
                        {attachment.sections.map((section) => (
                          <label key={`${attachment.nome}:${section.nome}`} className="checkbox-field">
                            <input
                              type="checkbox"
                              checked={selectedSections.includes(section.nome)}
                              disabled={importingModelAttachments}
                              onChange={(event) => {
                                setSelectedImportSections((current) => {
                                  const currentSections = current[attachment.nome] || []
                                  return {
                                    ...current,
                                    [attachment.nome]: event.target.checked
                                      ? [...currentSections, section.nome]
                                      : currentSections.filter((name) => name !== section.nome),
                                  }
                                })
                              }}
                            />
                            <span>{section.nome}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </AppDialog>

      <AppDialog
        open={sectionImportDialog.open}
        title="Adicionar seção do modelo"
        description={
          sectionImportDialog.anexo
            ? `Escolha quais seções do modelo devem ser adicionadas em ${sectionImportDialog.anexo.nome}.`
            : ''
        }
        onClose={importingSections ? undefined : () => setSectionImportDialog({ open: false, anexo: null })}
        actions={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setSectionImportDialog({ open: false, anexo: null })}
              disabled={importingSections}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={importarSecoesDoModelo}
              disabled={importingSections || selectedSectionImportNames.length === 0}
            >
              {importingSections ? 'Importando...' : 'Importar seções'}
            </button>
          </>
        }
      >
        {loadingSectionImportOptions ? (
          <p className="muted">Carregando seções compatíveis...</p>
        ) : sectionImportOptions.length === 0 ? (
          <p className="muted">Nenhuma seção compatível foi encontrada no modelo.</p>
        ) : (
          <div className="stack">
            {sectionImportOptions.map((section) => {
              const checked = selectedSectionImportNames.includes(section.nome)

              return (
                <label key={section.id} className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={section.alreadyImported || importingSections}
                    onChange={(event) => {
                      setSelectedSectionImportNames((current) =>
                        event.target.checked
                          ? [...current, section.nome]
                          : current.filter((name) => name !== section.nome)
                      )
                    }}
                  />
                  <span>
                    {section.nome}
                    {section.alreadyImported ? ' (já importada)' : ''}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </AppDialog>

      <PageHeader
        eyebrow="Documentação"
        title={dados.documentacao.titulo}
        description="Estrutura da documentação com anexos, seções, campos e respostas persistidas para consulta e manutenção."
        actions={
          <div className="cluster">
            <button
              className="btn btn--secondary"
              onClick={() =>
                dados.documentacao.servico_id
                  ? router.push(`/dashboard/servico/${dados.documentacao.servico_id}`)
                  : router.push('/dashboard')
              }
            >
              Voltar
            </button>
            <button className="btn btn--ghost" onClick={() => router.push('/dashboard')}>
              Dashboard
            </button>
            {dados.documentacao.categoria === 'Qualificação' ? (
              <button className="btn btn--ghost" onClick={() => setSyncModelDialogOpen(true)}>
                Atualizar modelo
              </button>
            ) : null}
            <button className="btn btn--secondary" onClick={abrirDialogImportacao}>
              Importar do modelo
            </button>
          </div>
        }
        meta={
          <>
            <span className="badge badge--primary">{dados.documentacao.categoria}</span>
            <span className="badge">{dados.documentacao.tipo}</span>
            <span className="badge">
              {dados.documentacao.modo_criacao_documentacao || 'por_sistema'}
            </span>
            <span className="badge">
              {dados.sistemas?.length
                ? dados.sistemas.map((sistema) => sistema.nome).join(', ')
                : dados.documentacao.sistema_id
                  ? `Sistema #${dados.documentacao.sistema_id}`
                  : 'Todos os sistemas'}
            </span>
            <span className="badge">{dados.anexos.length} anexos</span>
            <span className="badge">{totalCampos} campos</span>
          </>
        }
      />

      {feedback.error ? <p className="feedback-text feedback-text--error">{feedback.error}</p> : null}
      {feedback.success ? <p className="feedback-text">{feedback.success}</p> : null}

      {dados.anexos.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            title="Nenhum anexo encontrado"
            description="Esta documentação ainda não possui anexos vinculados."
            action={
              <button className="btn btn--secondary" onClick={abrirDialogImportacao}>
                Importar do modelo
              </button>
            }
          />
        </SurfaceCard>
      ) : (
        <div className="anexo-list">
          {attachmentGroups.map((group) => (
            <SurfaceCard key={group.baseName}>
              <div className="surface-card__header">
                <div>
                  <h2 className="surface-card__title">{group.baseName}</h2>
                  <p className="surface-card__subtitle">
                    {group.attachments[0]?.descricao || 'Sem descrição cadastrada para este anexo.'}
                  </p>
                </div>
                <div className="cluster">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => toggleGroupCollapsed(group.baseName)}
                  >
                    {collapsedGroupNames.includes(group.baseName) ? 'Expandir' : 'Recolher'}
                  </button>
                  {isOQDocument && group.baseName === 'Startup de UTA' ? (
                    <button
                      className="btn btn--primary"
                      onClick={adicionarEquipamento}
                      disabled={addingEquipment || dados.anexos.length === 0}
                    >
                      {addingEquipment ? 'Adicionando...' : 'Adicionar equipamento'}
                    </button>
                  ) : null}
                </div>
              </div>

              {collapsedGroupNames.includes(group.baseName) ? null : (
              <div className="anexo-list">
                {group.attachments.map((anexo) => (
                  <SurfaceCard key={anexo.id}>
                    <div className="surface-card__header">
                      <div>
                        <h3 className="surface-card__title">{getAttachmentEquipmentLabel(anexo.nome)}</h3>
                        <p className="surface-card__subtitle">
                          {anexo.nome}
                        </p>
                      </div>
                      <div className="cluster">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => toggleAnexoCollapsed(anexo.id)}
                        >
                          {collapsedAnexoIds.includes(anexo.id) ? 'Expandir' : 'Recolher'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger"
                          onClick={() => setDeleteAnexoDialog({ open: true, anexo })}
                          disabled={deletingAnexoId === anexo.id}
                        >
                          {deletingAnexoId === anexo.id ? 'Excluindo...' : 'Excluir anexo'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => abrirDialogImportacaoSecao(anexo)}
                          disabled={loadingSectionImportOptions || importingSections}
                        >
                          Adicionar seção do modelo
                        </button>
                      </div>
                    </div>

                    {collapsedAnexoIds.includes(anexo.id) ? null : anexo.secoes.length === 0 ? (
                      <EmptyState
                        title="Nenhuma seção encontrada"
                        description="Use a ação acima para adicionar a primeira seção deste anexo."
                      />
                    ) : (
                      <div className="section-list">
                        {anexo.secoes.map((secao) => (
                          <div key={secao.id} className="section-panel stack">
                            <div className="section-panel__header">
                              <div className="cluster">
                                <span className="badge badge--primary">{secao.nome}</span>
                                <span className="badge">
                                  {secao.campos.length} {secao.campos.length === 1 ? 'campo' : 'campos'}
                                </span>
                              </div>
                              <div className="cluster">
                                <button
                                  type="button"
                                  className="btn btn--ghost"
                                  onClick={() => toggleSectionCollapsed(secao.id)}
                                >
                                  {collapsedSectionIds.includes(secao.id) ? 'Expandir' : 'Recolher'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--danger"
                                  onClick={() => setDeleteSectionDialog({ open: true, secao })}
                                  disabled={deletingSectionId === secao.id}
                                >
                                  {deletingSectionId === secao.id ? 'Excluindo...' : 'Excluir seção'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--secondary"
                                  onClick={() => salvarSecao(secao)}
                                  disabled={savingSectionId === secao.id}
                                >
                                  {savingSectionId === secao.id ? 'Salvando...' : 'Salvar respostas'}
                                </button>
                              </div>
                            </div>

                            {collapsedSectionIds.includes(secao.id) ? null : renderSectionFields(secao)}
                          </div>
                        ))}
                      </div>
                    )}
                  </SurfaceCard>
                ))}
              </div>
              )}
            </SurfaceCard>
          ))}
        </div>
      )}
    </PageShell>
  )
}
