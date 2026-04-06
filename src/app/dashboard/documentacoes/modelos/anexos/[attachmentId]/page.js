'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { EmptyState, PageHeader, PageShell, SurfaceCard } from '@/components/ui'
import { ConfirmDialog, PromptDialog } from '@/components/AppDialog'
import {
  addAttachmentSectionModel,
  addAttachmentSectionFieldModel,
  deleteAttachmentSectionModel,
  ensureAirflowFieldsForSection,
  ensureIdentificationFieldsForSection,
  fetchAttachmentModelDetails,
  renameAttachmentSectionModel,
  reorderAttachmentSectionModels,
} from '@/features/documentacao/services/documentacaoModelService'

const AIRFLOW_BLOCK_LABELS = [
  'Duto de ar de insuflamento',
  'Duto de ar de retorno',
  'Duto de ar externo',
]
const AIRFLOW_SEGMENT_COUNT_SUFFIX = 'Quantidade de trechos'
const AIRFLOW_ACCEPTANCE_SUFFIX = 'Critério de aceitação por ponto'
const AIRFLOW_MATRIX_STORAGE_SUFFIX = 'Leituras da matriz'
const AIRFLOW_SEGMENTS_DATA_SUFFIX = 'Trechos de pitot'
const AIRFLOW_MEASURED_FLOW_SUFFIX = 'Vazão medida'
const AIRFLOW_PERCENTAGE_SUFFIX = '% em relação à vazão nominal'
const AIRFLOW_DEVIATION_COMMENT_SUFFIX = 'Comentário de desvio'

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase()
}

function isIdentificationSection(section) {
  const normalizedName = normalizeValue(section?.nome)
  return normalizedName === 'identificação' || normalizedName === 'identificacao'
}

function isAirflowSection(section) {
  const normalizedName = normalizeValue(section?.nome)
  return normalizedName === 'vazão de ar' || normalizedName === 'vazao de ar'
}

function isInstrumentField(field) {
  const normalizedName = normalizeValue(field?.nome)
  return (
    normalizedName === 'alicate amperímetro'.toLowerCase() ||
    normalizedName === 'alicate amperimetro' ||
    normalizedName === 'balômetro'.toLowerCase() ||
    normalizedName === 'balometro' ||
    normalizedName === 'manômetro ta scope'.toLowerCase() ||
    normalizedName === 'manometro ta scope'
  )
}

function getModelFieldType(field) {
  const normalizedName = normalizeValue(field?.nome)

  if (normalizedName === 'data de inspeção' || normalizedName === 'data de inspecao') {
    return 'date'
  }

  if (normalizedName === 'procedimento') {
    return 'select'
  }

  return field?.tipo || 'text'
}

function getModelFieldLabel(field) {
  if (isInstrumentField(field)) {
    return 'Nº de série'
  }

  return field?.label || field?.nome || 'Campo'
}

function groupAirflowFields(fields) {
  return AIRFLOW_BLOCK_LABELS.map((blockLabel) => ({
    blockLabel,
    fields: (fields || []).filter(
      (field) =>
        String(field.nome || '').startsWith(`${blockLabel} - `) &&
        !String(field.nome || '').endsWith(` - ${AIRFLOW_SEGMENT_COUNT_SUFFIX}`) &&
        !String(field.nome || '').endsWith(` - ${AIRFLOW_ACCEPTANCE_SUFFIX}`) &&
        !String(field.nome || '').endsWith(` - ${AIRFLOW_MATRIX_STORAGE_SUFFIX}`) &&
        !String(field.nome || '').endsWith(` - ${AIRFLOW_SEGMENTS_DATA_SUFFIX}`) &&
        !String(field.nome || '').endsWith(` - ${AIRFLOW_MEASURED_FLOW_SUFFIX}`) &&
        !String(field.nome || '').endsWith(` - ${AIRFLOW_PERCENTAGE_SUFFIX}`) &&
        !String(field.nome || '').endsWith(` - ${AIRFLOW_DEVIATION_COMMENT_SUFFIX}`)
    ),
  }))
}

export default function ModeloAnexoPage() {
  const params = useParams()
  const router = useRouter()
  const attachmentId = Number(params.attachmentId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [draggingSectionId, setDraggingSectionId] = useState(null)
  const [collapsedSectionIds, setCollapsedSectionIds] = useState([])
  const [dados, setDados] = useState(null)
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [promptDialog, setPromptDialog] = useState({
    open: false,
    title: '',
    description: '',
    label: '',
    defaultValue: '',
    confirmLabel: 'Salvar',
    onConfirm: null,
  })
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Excluir',
    onConfirm: null,
  })

  useEffect(() => {
    let cancelled = false

    async function loadAttachment() {
      if (Number.isNaN(attachmentId)) {
        setError('ID do anexo do modelo inválido.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const loaded = await fetchAttachmentModelDetails(attachmentId)

        if (!cancelled) {
          setDados(loaded)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Nao foi possivel carregar o anexo do modelo.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAttachment()

    return () => {
      cancelled = true
    }
  }, [attachmentId])

  async function refreshAttachment() {
    const loaded = await fetchAttachmentModelDetails(attachmentId)
    setDados(loaded)
    return loaded
  }

  function closePromptDialog() {
    setPromptDialog((current) => ({ ...current, open: false }))
    setDialogError('')
  }

  function closeConfirmDialog() {
    setConfirmDialog((current) => ({ ...current, open: false }))
    setDialogError('')
  }

  function handleAddSection() {
    if (!dados?.attachment?.id) {
      return
    }

    setPromptDialog({
      open: true,
      title: 'Nova seção',
      description: `Cadastre a próxima seção do anexo ${dados.attachment.nome}.`,
      label: 'Nome da seção',
      defaultValue: '',
      confirmLabel: 'Criar seção',
      onConfirm: async (nome) => {
        if (!nome || !nome.trim()) {
          setDialogError('Informe o nome da seção.')
          return
        }

        try {
          setDialogBusy(true)
          await addAttachmentSectionModel({
            attachmentId: dados.attachment.id,
            nome: nome.trim(),
          })
          await refreshAttachment()
          setFeedback('Seção criada com sucesso.')
          setError('')
          closePromptDialog()
        } catch (actionError) {
          setDialogError(actionError.message || 'Nao foi possivel adicionar a seção.')
          setFeedback('')
        } finally {
          setDialogBusy(false)
        }
      },
    })
    setDialogError('')
  }

  function handleRenameSection(section) {
    setPromptDialog({
      open: true,
      title: 'Editar seção',
      description: 'Atualize o nome desta seção do modelo.',
      label: 'Nome da seção',
      defaultValue: section.nome,
      confirmLabel: 'Salvar seção',
      onConfirm: async (nome) => {
        if (!nome || !nome.trim()) {
          setDialogError('Informe o nome da seção.')
          return
        }

        if (nome.trim() === section.nome) {
          closePromptDialog()
          return
        }

        try {
          setDialogBusy(true)
          await renameAttachmentSectionModel({
            sectionId: section.id,
            nome: nome.trim(),
          })
          await refreshAttachment()
          setFeedback('Seção atualizada com sucesso.')
          setError('')
          closePromptDialog()
        } catch (actionError) {
          setDialogError(actionError.message || 'Nao foi possivel atualizar a seção.')
          setFeedback('')
        } finally {
          setDialogBusy(false)
        }
      },
    })
    setDialogError('')
  }

  function handleDeleteSection(section) {
    setConfirmDialog({
      open: true,
      title: 'Excluir seção',
      description: `A seção "${section.nome}" será removida deste anexo do modelo.`,
      confirmLabel: 'Excluir seção',
      onConfirm: async () => {
        try {
          setDialogBusy(true)
          await deleteAttachmentSectionModel(section.id)
          await refreshAttachment()
          setFeedback('Seção excluída com sucesso.')
          setError('')
          closeConfirmDialog()
        } catch (actionError) {
          setDialogError(actionError.message || 'Nao foi possivel excluir a seção.')
          setFeedback('')
        } finally {
          setDialogBusy(false)
        }
      },
    })
    setDialogError('')
  }

  function handleAddField(section) {
    setPromptDialog({
      open: true,
      title: 'Novo campo',
      description: `Cadastre um novo campo na seção ${section.nome}.`,
      label: 'Nome do campo',
      defaultValue: '',
      confirmLabel: 'Criar campo',
      onConfirm: async (nome) => {
        if (!nome || !nome.trim()) {
          setDialogError('Informe o nome do campo.')
          return
        }

        try {
          setDialogBusy(true)
          await addAttachmentSectionFieldModel({
            sectionId: section.id,
            nome: nome.trim(),
          })
          await refreshAttachment()
          setFeedback('Campo criado com sucesso.')
          setError('')
          closePromptDialog()
        } catch (actionError) {
          setDialogError(actionError.message || 'Nao foi possivel adicionar o campo.')
          setFeedback('')
        } finally {
          setDialogBusy(false)
        }
      },
    })
    setDialogError('')
  }

  async function handleApplyIdentificationFields(section) {
    try {
      setDialogBusy(true)
      await ensureIdentificationFieldsForSection(section.id)
      await refreshAttachment()
      setFeedback('Campos de Identificação aplicados com sucesso.')
      setError('')
    } catch (actionError) {
      setError(actionError.message || 'Nao foi possivel aplicar os campos de Identificação.')
      setFeedback('')
    } finally {
      setDialogBusy(false)
    }
  }

  async function handleApplyAirflowFields(section) {
    try {
      setDialogBusy(true)
      await ensureAirflowFieldsForSection(section.id)
      await refreshAttachment()
      setFeedback('Campos de Vazão de Ar aplicados com sucesso.')
      setError('')
    } catch (actionError) {
      setError(actionError.message || 'Nao foi possivel aplicar os campos de Vazão de Ar.')
      setFeedback('')
    } finally {
      setDialogBusy(false)
    }
  }

  async function reorderSections(sectionId, targetSectionId) {
    if (!sectionId || !targetSectionId || sectionId === targetSectionId || !dados?.sections) {
      return
    }

    const currentSections = [...dados.sections]
    const currentIndex = currentSections.findIndex((item) => item.id === sectionId)
    const targetIndex = currentSections.findIndex((item) => item.id === targetSectionId)

    if (currentIndex < 0 || targetIndex < 0) {
      return
    }

    const [movedSection] = currentSections.splice(currentIndex, 1)
    currentSections.splice(targetIndex, 0, movedSection)

    try {
      await reorderAttachmentSectionModels(currentSections)
      await refreshAttachment()
      setDraggingSectionId(null)
      setFeedback('Ordem das seções atualizada.')
      setError('')
    } catch (actionError) {
      setError(actionError.message || 'Nao foi possivel reordenar as seções.')
      setFeedback('')
    }
  }

  function toggleSectionCollapsed(sectionId) {
    setCollapsedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
    )
  }

  if (loading) {
    return (
      <PageShell>
        <SurfaceCard>
          <span className="muted">Carregando anexo do modelo...</span>
        </SurfaceCard>
      </PageShell>
    )
  }

  if (error && !dados) {
    return (
      <PageShell>
        <SurfaceCard>
          <p className="feedback-text feedback-text--error">{error}</p>
        </SurfaceCard>
      </PageShell>
    )
  }

  if (!dados) {
    return (
      <PageShell>
        <SurfaceCard>
          <span className="muted">Nenhum anexo do modelo encontrado.</span>
        </SurfaceCard>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PromptDialog
        key={`${promptDialog.title}:${promptDialog.defaultValue}:${promptDialog.open}`}
        open={promptDialog.open}
        title={promptDialog.title}
        description={promptDialog.description}
        label={promptDialog.label}
        defaultValue={promptDialog.defaultValue}
        confirmLabel={promptDialog.confirmLabel}
        busy={dialogBusy}
        error={dialogError}
        onClose={closePromptDialog}
        onConfirm={(value) => promptDialog.onConfirm?.(value)}
      />
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        busy={dialogBusy}
        onClose={closeConfirmDialog}
        onConfirm={() => confirmDialog.onConfirm?.()}
      />

      <PageHeader
        eyebrow="Modelos de documentação"
        title={dados.attachment.nome}
        description="Edite as seções internas deste anexo do modelo. Essa estrutura será reutilizada na documentação do serviço."
        actions={
          <div className="cluster">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => router.push('/dashboard/documentacoes')}
            >
              Voltar para modelos
            </button>
            <button type="button" className="btn btn--secondary" onClick={handleAddSection}>
              Adicionar seção
            </button>
          </div>
        }
        meta={
          <>
            <span className="badge badge--primary">
              {dados.attachment.modality} {dados.attachment.qualificationType}
            </span>
            <span className="badge">{dados.sections.length} seções</span>
          </>
        }
      />

      {error ? <p className="feedback-text feedback-text--error">{error}</p> : null}
      {feedback ? <p className="feedback-text">{feedback}</p> : null}

      <SurfaceCard>
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">Seções do anexo</h2>
            <p className="surface-card__subtitle">
              Arraste para reordenar. Use editar e excluir para ajustar a estrutura do modelo.
            </p>
          </div>
        </div>

        {dados.sections.length === 0 ? (
          <EmptyState
            title="Nenhuma seção cadastrada"
            description="Crie a primeira seção deste anexo do modelo."
            action={
              <button type="button" className="btn btn--secondary" onClick={handleAddSection}>
                Adicionar seção
              </button>
            }
          />
        ) : (
          <div className="section-list">
            {dados.sections.map((section, index) => (
              <div
                key={section.id}
                className="plan-item"
                draggable
                onDragStart={() => setDraggingSectionId(section.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => reorderSections(draggingSectionId, section.id)}
                onDragEnd={() => setDraggingSectionId(null)}
              >
                <div className="stack" style={{ width: '100%' }}>
                  <div className="plan-item">
                    <div>
                      <strong>Seção {index + 1}</strong>
                      <p className="muted">{section.nome}</p>
                    </div>
                    <div className="cluster">
                      <span className="badge">Arraste para reordenar</span>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => toggleSectionCollapsed(section.id)}
                      >
                        {collapsedSectionIds.includes(section.id) ? 'Expandir' : 'Recolher'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => handleAddField(section)}
                      >
                        Adicionar campo
                      </button>
                      {String(section.nome || '').trim().toLowerCase() === 'identificação' ||
                      String(section.nome || '').trim().toLowerCase() === 'identificacao' ? (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => handleApplyIdentificationFields(section)}
                          disabled={dialogBusy}
                        >
                          Aplicar campos de Identificação
                        </button>
                      ) : null}
                      {isAirflowSection(section) ? (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => handleApplyAirflowFields(section)}
                          disabled={dialogBusy}
                        >
                          Aplicar campos de Vazão de Ar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => handleRenameSection(section)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => handleDeleteSection(section)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {collapsedSectionIds.includes(section.id) ? null : section.campos?.length ? (
                    isIdentificationSection(section) ? (
                      <div className="stack">
                        <div className="bullet-list">
                          {section.campos
                            .filter((campo) => !isInstrumentField(campo))
                            .map((campo) => (
                              <div key={campo.id} className="group-summary">
                                <span>{getModelFieldLabel(campo)}</span>
                                <span className="badge">{getModelFieldType(campo)}</span>
                              </div>
                            ))}
                        </div>

                        {section.campos.some(isInstrumentField) ? (
                          <SurfaceCard>
                            <div className="surface-card__header">
                              <div>
                                <h4 className="surface-card__title">Instrumentos utilizados</h4>
                                <p className="surface-card__subtitle">
                                  Campos agrupados para número de série dos instrumentos.
                                </p>
                              </div>
                            </div>

                            <div className="bullet-list">
                              {section.campos
                                .filter(isInstrumentField)
                                .map((campo) => (
                                  <div key={campo.id} className="group-summary">
                                    <span>{campo.nome}</span>
                                    <span className="badge">{getModelFieldLabel(campo)}</span>
                                  </div>
                                ))}
                            </div>
                          </SurfaceCard>
                        ) : null}
                      </div>
                    ) : isAirflowSection(section) ? (
                      <div className="stack">
                        {groupAirflowFields(section.campos).map((block) => (
                          <SurfaceCard key={block.blockLabel}>
                            <div className="surface-card__header">
                              <div>
                                <h4 className="surface-card__title">{block.blockLabel}</h4>
                                <p className="surface-card__subtitle">
                                  Bloco padrão de medições de vazão.
                                </p>
                              </div>
                            </div>

                            {block.fields.length > 0 ? (
                              <div className="bullet-list">
                                {block.fields.map((campo) => (
                                  <div key={campo.id} className="group-summary">
                                    <span>{campo.label || campo.nome}</span>
                                    <span className="badge">{getModelFieldType(campo)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="muted">Nenhum campo cadastrado neste bloco.</p>
                            )}
                          </SurfaceCard>
                        ))}
                      </div>
                    ) : (
                      <div className="bullet-list">
                        {section.campos.map((campo) => (
                          <div key={campo.id} className="group-summary">
                            <span>{getModelFieldLabel(campo)}</span>
                            <span className="badge">{getModelFieldType(campo)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="muted">Nenhum campo cadastrado nesta seção.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </PageShell>
  )
}
