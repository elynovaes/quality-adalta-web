'use client'

import { useEffect, useState } from 'react'
import { EmptyState, PageHeader, PageShell, SurfaceCard } from '@/components/ui'
import {
  addAttachmentModel,
  addModelReportType,
  addQualificationModality,
  addQualificationType,
  fetchDocumentacaoModelCatalog,
} from '@/features/documentacao/services/documentacaoModelService'

function normalizeEntry(value) {
  return value.trim()
}

export default function DocumentacoesHubPage() {
  const [catalog, setCatalog] = useState(null)
  const [selectedModality, setSelectedModality] = useState('HVAC')
  const [selectedQualificationType, setSelectedQualificationType] = useState('OQ')
  const [error, setError] = useState('')

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

    if (!loadedCatalog.qualificationModalities.includes(selectedModality)) {
      setSelectedModality(loadedCatalog.qualificationModalities[0] || 'HVAC')
    }

    const currentTypes = loadedCatalog.qualificationTypesByModality?.[selectedModality] || []

    if (!currentTypes.includes(selectedQualificationType)) {
      setSelectedQualificationType(currentTypes[0] || 'OQ')
    }
  }

  async function handleAddReportType() {
    const nextType = window.prompt('Nome do novo tipo de relatório')

    if (!nextType) {
      return
    }

    const normalizedType = normalizeEntry(nextType)

    if (!normalizedType) {
      return
    }

    try {
      await addModelReportType(normalizedType)
      await refreshCatalog()
      setError('')
    } catch (actionError) {
      setError(actionError.message || 'Nao foi possivel adicionar o tipo de relatório.')
    }
  }

  async function handleAddQualificationModality() {
    const nextModality = window.prompt('Nome da nova modalidade de Qualificação')

    if (!nextModality) {
      return
    }

    const normalizedModality = normalizeEntry(nextModality)

    if (!normalizedModality) {
      return
    }

    try {
      await addQualificationModality(normalizedModality)
      await refreshCatalog()
      setSelectedModality(normalizedModality)
      setError('')
    } catch (actionError) {
      setError(actionError.message || 'Nao foi possivel adicionar a modalidade.')
    }
  }

  async function handleAddQualificationType() {
    const nextType = window.prompt(`Nome do novo tipo de qualificação em ${selectedModality}`)

    if (!nextType) {
      return
    }

    const normalizedType = normalizeEntry(nextType).toUpperCase()

    if (!normalizedType) {
      return
    }

    try {
      await addQualificationType({
        modalidade: selectedModality,
        nome: normalizedType,
      })
      await refreshCatalog()
      setSelectedQualificationType(normalizedType)
      setError('')
    } catch (actionError) {
      setError(actionError.message || 'Nao foi possivel adicionar o tipo de qualificação.')
    }
  }

  async function handleAddAttachment() {
    const nextAttachment = window.prompt(`Nome do novo anexo de ${selectedModality} ${selectedQualificationType}`)

    if (!nextAttachment) {
      return
    }

    const normalizedAttachment = normalizeEntry(nextAttachment)

    if (!normalizedAttachment) {
      return
    }

    try {
      await addAttachmentModel({
        modalidade: selectedModality,
        qualificationType: selectedQualificationType,
        nome: normalizedAttachment,
      })
      await refreshCatalog()
      setError('')
    } catch (actionError) {
      setError(actionError.message || 'Nao foi possivel adicionar o anexo ao modelo.')
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
                  onClick={() => setSelectedQualificationType(type)}
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
                    <div key={`${attachment.id || attachment.nome}-${index}`} className="plan-item">
                      <div>
                        <strong>Anexo {String(index + 1).padStart(2, '0')}</strong>
                        <p className="muted">{attachment.nome}</p>
                      </div>
                      <span className="badge badge--primary">
                        {selectedModality} {selectedQualificationType}
                      </span>
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
