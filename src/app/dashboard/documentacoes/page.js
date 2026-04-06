'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmptyState, PageHeader, PageShell, SurfaceCard } from '@/components/ui'
import { PromptDialog } from '@/components/AppDialog'
import {
  addAttachmentModel,
  addModelReportType,
  addQualificationModality,
  addQualificationType,
  fetchDocumentacaoModelCatalog,
  reorderAttachmentModels,
} from '@/features/documentacao/services/documentacaoModelService'

function normalizeEntry(value) {
  return value.trim()
}

function indexToLetters(index) {
  let current = index + 1
  let result = ''

  while (current > 0) {
    const remainder = (current - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    current = Math.floor((current - 1) / 26)
  }

  return result
}

export default function DocumentacoesHubPage() {
  const router = useRouter()
  const [catalog, setCatalog] = useState(null)
  const [selectedModality, setSelectedModality] = useState('HVAC')
  const [selectedQualificationType, setSelectedQualificationType] = useState('OQ')
  const [draggingAttachmentId, setDraggingAttachmentId] = useState(null)
  const [error, setError] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [dialogBusy, setDialogBusy] = useState(false)
  const [promptDialog, setPromptDialog] = useState({
    open: false,
    title: '',
    description: '',
    label: '',
    placeholder: '',
    defaultValue: '',
    confirmLabel: 'Salvar',
    onConfirm: null,
  })

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      try {
        const loadedCatalog = await fetchDocumentacaoModelCatalog()

        if (!cancelled) {
          setCatalog(loadedCatalog)

          const nextModality = loadedCatalog.qualificationModalities[0] || 'HVAC'
          const nextQualificationType =
            loadedCatalog.qualificationTypesByModality?.[nextModality]?.[0] || 'OQ'

          setSelectedModality((current) =>
            loadedCatalog.qualificationModalities.includes(current) ? current : nextModality
          )
          setSelectedQualificationType(nextQualificationType)
          setError('')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Nao foi possivel carregar os modelos.')
        }
      }
    }

    loadCatalog()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshCatalog() {
    const loadedCatalog = await fetchDocumentacaoModelCatalog()
    setCatalog(loadedCatalog)

    const nextModality = loadedCatalog.qualificationModalities.includes(selectedModality)
      ? selectedModality
      : loadedCatalog.qualificationModalities[0] || 'HVAC'

    if (nextModality !== selectedModality) {
      setSelectedModality(nextModality)
    }

    const currentTypes = loadedCatalog.qualificationTypesByModality?.[nextModality] || []
    const nextQualificationType = currentTypes.includes(selectedQualificationType)
      ? selectedQualificationType
      : currentTypes[0] || 'OQ'

    if (nextQualificationType !== selectedQualificationType) {
      setSelectedQualificationType(nextQualificationType)
    }

    return loadedCatalog
  }

  function closePromptDialog() {
    setPromptDialog((current) => ({ ...current, open: false }))
    setDialogError('')
  }

  function openPromptDialog(config) {
    setPromptDialog({
      open: true,
      title: config.title,
      description: config.description || '',
      label: config.label,
      placeholder: config.placeholder || '',
      defaultValue: config.defaultValue || '',
      confirmLabel: config.confirmLabel || 'Salvar',
      onConfirm: config.onConfirm,
    })
    setDialogError('')
  }

  function handleAddReportType() {
    openPromptDialog({
      title: 'Novo tipo de relatório',
      description: 'Cadastre um novo tipo mestre para aparecer na página de modelos.',
      label: 'Nome do tipo',
      placeholder: 'Ex.: Validação',
      confirmLabel: 'Criar tipo',
      onConfirm: async (value) => {
        const normalizedType = normalizeEntry(value)

        if (!normalizedType) {
          setDialogError('Informe o nome do tipo de relatório.')
          return
        }

        try {
          setDialogBusy(true)
          await addModelReportType(normalizedType)
          await refreshCatalog()
          closePromptDialog()
          setError('')
        } catch (actionError) {
          setDialogError(actionError.message || 'Nao foi possivel adicionar o tipo de relatório.')
        } finally {
          setDialogBusy(false)
        }
      },
    })
  }

  function handleAddQualificationModality() {
    openPromptDialog({
      title: 'Nova modalidade de Qualificação',
      description: 'Essa modalidade ficará disponível para montar modelos de anexos.',
      label: 'Nome da modalidade',
      placeholder: 'Ex.: Salas limpas',
      confirmLabel: 'Criar modalidade',
      onConfirm: async (value) => {
        const normalizedModality = normalizeEntry(value)

        if (!normalizedModality) {
          setDialogError('Informe o nome da modalidade.')
          return
        }

        try {
          setDialogBusy(true)
          await addQualificationModality(normalizedModality)
          await refreshCatalog()
          setSelectedModality(normalizedModality)
          closePromptDialog()
          setError('')
        } catch (actionError) {
          setDialogError(actionError.message || 'Nao foi possivel adicionar a modalidade.')
        } finally {
          setDialogBusy(false)
        }
      },
    })
  }

  function handleAddQualificationType() {
    openPromptDialog({
      title: `Novo tipo em ${selectedModality}`,
      description: 'Use essa ação para cadastrar novas etapas além de IQ, OQ e PQ.',
      label: 'Nome do tipo',
      placeholder: 'Ex.: FAT',
      confirmLabel: 'Criar tipo',
      onConfirm: async (value) => {
        const normalizedType = normalizeEntry(value).toUpperCase()

        if (!normalizedType) {
          setDialogError('Informe o nome do tipo de qualificação.')
          return
        }

        try {
          setDialogBusy(true)
          await addQualificationType({
            modalidade: selectedModality,
            nome: normalizedType,
          })
          await refreshCatalog()
          setSelectedQualificationType(normalizedType)
          closePromptDialog()
          setError('')
        } catch (actionError) {
          setDialogError(actionError.message || 'Nao foi possivel adicionar o tipo de qualificação.')
        } finally {
          setDialogBusy(false)
        }
      },
    })
  }

  function handleAddAttachment() {
    openPromptDialog({
      title: `Novo anexo de ${selectedModality} ${selectedQualificationType}`,
      description: 'Depois de criar, você já será levado para a página própria do anexo.',
      label: 'Nome do anexo',
      placeholder: 'Ex.: Startup de UTA',
      confirmLabel: 'Criar anexo',
      onConfirm: async (value) => {
        const normalizedAttachment = normalizeEntry(value)

        if (!normalizedAttachment) {
          setDialogError('Informe o nome do anexo.')
          return
        }

        try {
          setDialogBusy(true)
          await addAttachmentModel({
            modalidade: selectedModality,
            qualificationType: selectedQualificationType,
            nome: normalizedAttachment,
          })
          const refreshedCatalog = await refreshCatalog()
          const currentAttachments =
            refreshedCatalog.attachmentsByKey?.[`${selectedModality}:${selectedQualificationType}`] || []
          const createdAttachment = currentAttachments.find((attachment) => attachment.nome === normalizedAttachment)
          closePromptDialog()
          setError('')

          if (createdAttachment?.id) {
            router.push(`/dashboard/documentacoes/modelos/anexos/${createdAttachment.id}`)
          }
        } catch (actionError) {
          setDialogError(actionError.message || 'Nao foi possivel adicionar o anexo ao modelo.')
        } finally {
          setDialogBusy(false)
        }
      },
    })
  }

  async function reorderAttachments(attachmentId, targetAttachmentId) {
    if (!attachmentId || !targetAttachmentId || attachmentId === targetAttachmentId) {
      return
    }

    const currentAttachments = [...attachments]
    const currentIndex = currentAttachments.findIndex((item) => item.id === attachmentId)
    const targetIndex = currentAttachments.findIndex((item) => item.id === targetAttachmentId)

    if (currentIndex < 0 || targetIndex < 0) {
      return
    }

    const [movedAttachment] = currentAttachments.splice(currentIndex, 1)
    currentAttachments.splice(targetIndex, 0, movedAttachment)

    try {
      await reorderAttachmentModels(currentAttachments)
      await refreshCatalog()
      setDraggingAttachmentId(null)
      setError('')
    } catch (actionError) {
      setError(actionError.message || 'Nao foi possivel reordenar os anexos.')
    }
  }

  if (!catalog) {
    return (
      <PageShell>
        <SurfaceCard>
          <span className="muted">Carregando modelos de documentação...</span>
        </SurfaceCard>
      </PageShell>
    )
  }

  const reportTypes = catalog.reportTypes || []
  const qualificationModalities = catalog.qualificationModalities || []
  const qualificationTypes = catalog.qualificationTypesByModality?.[selectedModality] || []
  const attachments =
    catalog.attachmentsByKey?.[`${selectedModality}:${selectedQualificationType}`] || []

  return (
    <PageShell>
      <PromptDialog
        key={`${promptDialog.title}:${promptDialog.defaultValue}:${promptDialog.open}`}
        open={promptDialog.open}
        title={promptDialog.title}
        description={promptDialog.description}
        label={promptDialog.label}
        placeholder={promptDialog.placeholder}
        defaultValue={promptDialog.defaultValue}
        confirmLabel={promptDialog.confirmLabel}
        busy={dialogBusy}
        error={dialogError}
        onClose={closePromptDialog}
        onConfirm={(value) => promptDialog.onConfirm?.(value)}
      />

      <PageHeader
        eyebrow="Documentações"
        title="Modelos de documentação"
        description="Cadastre a estrutura mestre de tipos, modalidades e anexos para reutilizar no fluxo dos serviços."
        actions={
          <div className="cluster">
            <button className="btn btn--secondary" onClick={handleAddReportType}>
              Adicionar tipo
            </button>
            <button className="btn btn--ghost" onClick={handleAddQualificationModality}>
              Adicionar modalidade
            </button>
          </div>
        }
        meta={
          <>
            <span className="badge badge--primary">{reportTypes.length} tipos</span>
            <span className="badge">{qualificationModalities.length} modalidades</span>
            <span className="badge">{attachments.length} anexos no modelo atual</span>
          </>
        }
      />

      {error ? <p className="feedback-text feedback-text--error">{error}</p> : null}

      <SurfaceCard className="surface-card--hero">
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">Tipos cadastrados</h2>
            <p className="surface-card__subtitle">
              Esses são os tipos mestres que ficarão disponíveis para seleção na criação de documentações por serviço.
            </p>
          </div>
        </div>

        {reportTypes.length === 0 ? (
          <EmptyState
            title="Nenhum tipo de relatório cadastrado"
            description="Use a ação de adicionar para criar o primeiro tipo."
          />
        ) : (
          <div className="option-grid">
            {reportTypes.map((type) => (
              <div
                key={type}
                className={`option-card ${type === 'Qualificação' ? 'option-card--active' : ''}`}
              >
                <span className="option-card__title">{type}</span>
                <span className="option-card__description">
                  {type === 'Qualificação'
                    ? 'Tipo com modalidades e anexos parametrizados para o fluxo de serviços.'
                    : 'Tipo principal disponível para futura criação de modelos próprios.'}
                </span>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">Modalidades de Qualificação</h2>
            <p className="surface-card__subtitle">
              Selecione uma modalidade para configurar os tipos IQ, OQ, PQ e seus anexos.
            </p>
          </div>
        </div>

        {qualificationModalities.length === 0 ? (
          <EmptyState
            title="Nenhuma modalidade cadastrada"
            description="Adicione a primeira modalidade para estruturar Qualificação."
          />
        ) : (
          <div className="tabs-row" role="tablist" aria-label="Modalidades de Qualificação">
            {qualificationModalities.map((modality) => (
              <button
                key={modality}
                type="button"
                role="tab"
                aria-selected={selectedModality === modality}
                className={`tab-button ${selectedModality === modality ? 'tab-button--active' : ''}`}
                onClick={() => {
                  setSelectedModality(modality)
                  setSelectedQualificationType(
                    catalog.qualificationTypesByModality?.[modality]?.[0] || ''
                  )
                }}
              >
                {modality}
              </button>
            ))}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">{selectedModality}</h2>
            <p className="surface-card__subtitle">
              Esse bloco define o modelo que será reaproveitado quando uma documentação do serviço for criada a partir dessa modalidade.
            </p>
          </div>
          <button className="btn btn--secondary" onClick={handleAddQualificationType}>
            Adicionar IQ/OQ/PQ
          </button>
        </div>

        {qualificationTypes.length === 0 ? (
          <EmptyState
            title="Nenhum tipo de qualificação cadastrado"
            description="Crie o primeiro tipo para liberar a configuração de anexos."
          />
        ) : (
          <>
            <div className="tabs-row" role="tablist" aria-label={`Tipos de ${selectedModality}`}>
                {qualificationTypes.map((type) => (
                  <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={selectedQualificationType === type}
                  className={`tab-button ${selectedQualificationType === type ? 'tab-button--active' : ''}`}
                  onClick={() => {
                    setSelectedQualificationType(type)
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="stack-lg">
              <div className="surface-card__header">
                <div>
                  <h3 className="surface-card__title">Anexos do modelo</h3>
                  <p className="surface-card__subtitle">
                    Esses anexos serão oferecidos no fluxo do serviço para você decidir quais entram ou não na documentação final.
                  </p>
                </div>
                <button className="btn btn--ghost" onClick={handleAddAttachment}>
                  Adicionar anexo
                </button>
              </div>

              {attachments.length === 0 ? (
                <EmptyState
                  title="Nenhum anexo cadastrado"
                  description="Adicione o primeiro anexo para este tipo de qualificação."
                />
              ) : (
                <div className="documentation-plan__list">
                  {attachments.map((attachment, index) => (
                    <div
                      key={`${attachment.id || attachment.nome}-${index}`}
                      className="plan-item"
                      draggable={Boolean(attachment.id)}
                      onDragStart={() => setDraggingAttachmentId(attachment.id)}
                      onDragOver={(event) => {
                        event.preventDefault()
                      }}
                      onDrop={() => reorderAttachments(draggingAttachmentId, attachment.id)}
                      onDragEnd={() => setDraggingAttachmentId(null)}
                    >
                      <div>
                        <strong>Anexo {indexToLetters(index)}</strong>
                        <p className="muted">{attachment.nome}</p>
                      </div>
                      <div className="cluster">
                        <span className="badge">{attachment.id ? 'Arraste para reordenar' : 'Sem persistência'}</span>
                        <span className="badge badge--primary">
                          {selectedModality} {selectedQualificationType}
                        </span>
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => {
                            if (!attachment.id) {
                              return
                            }

                            router.push(`/dashboard/documentacoes/modelos/anexos/${attachment.id}`)
                          }}
                        >
                          Editar anexo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SurfaceCard>
    </PageShell>
  )
}
