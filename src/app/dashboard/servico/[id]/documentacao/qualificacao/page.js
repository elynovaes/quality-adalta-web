'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { EmptyState, PageHeader, PageShell, SurfaceCard } from '@/components/ui'
import { formatarModoCriacaoDocumentacao } from '@/lib/qualificacao'
import { formatDocumentType, formatQualificationType } from '@/features/documentacao/config/qualificationConfig'
import { fetchAttachmentsForQualification } from '@/features/documentacao/services/documentacaoModelService'
import { persistDocumentacaoFlow } from '@/features/documentacao/services/documentacaoPersistenceService'
import { fetchServicoResumo } from '@/features/documentacao/services/servicoResumoService'
import { useDocumentacaoFlowStore, useDocumentacaoFlowViewModel } from '@/stores/documentacao-flow-store'

export default function QualificacaoPage() {
  const params = useParams()
  const router = useRouter()
  const {
    hydratePersistedFlow,
    setServiceSnapshot,
    setPersistenceResult,
    setTemplateAttachments,
  } = useDocumentacaoFlowStore()
  const flow = useDocumentacaoFlowViewModel()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [modelAttachments, setModelAttachments] = useState({})
  const currentServiceId = Number(params.id)

  useEffect(() => {
    if (flow.serviceId === currentServiceId) {
      return
    }

    const hydrated = hydratePersistedFlow(currentServiceId)

    if (hydrated) {
      return
    }

    router.replace(`/dashboard/servico/${currentServiceId}/documentacao`)
  }, [currentServiceId, flow.serviceId, hydratePersistedFlow, router])

  useEffect(() => {
    if (flow.serviceId !== currentServiceId || flow.os) {
      return
    }

    fetchServicoResumo(currentServiceId)
      .then((resumo) =>
        setServiceSnapshot({
          id: resumo.id,
          os: resumo.os,
          cliente: resumo.cliente,
          sistema: resumo.sistema,
        })
      )
      .catch((fetchError) => {
        console.log(fetchError)
      })
  }, [currentServiceId, flow.os, flow.serviceId, setServiceSnapshot])

  useEffect(() => {
    let cancelled = false
    const selectedQualificationTypes = Array.from(
      new Set(
        flow.plan.flatMap((group) =>
          group.documentos.map((document) => document.qualificationTypeId)
        )
      )
    )

    async function loadModelAttachments() {
      if (selectedQualificationTypes.length === 0) {
        if (!cancelled) {
          setModelAttachments({})
        }
        return
      }

      try {
        const entries = await Promise.all(
          selectedQualificationTypes.map(async (qualificationTypeId) => [
            qualificationTypeId,
            await fetchAttachmentsForQualification({
              modalidade: flow.modalidadeQualificacao,
              qualificationType: qualificationTypeId.toUpperCase(),
            }),
          ])
        )

        if (cancelled) {
          return
        }

        const nextAttachments = Object.fromEntries(entries)
        setModelAttachments(nextAttachments)

        for (const [qualificationTypeId, attachments] of entries) {
          if (
            attachments.length > 0 &&
            (flow.modeloAnexosSelecionados?.[qualificationTypeId] || []).length === 0
          ) {
            setTemplateAttachments(qualificationTypeId, attachments)
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          console.log(loadError)
        }
      }
    }

    loadModelAttachments()

    return () => {
      cancelled = true
    }
  }, [
    flow.modalidadeQualificacao,
    flow.modeloAnexosSelecionados,
    flow.plan,
    setTemplateAttachments,
  ])

  async function handleCreateDocumentacoes() {
    if (flow.totalDocuments === 0) {
      setError('Selecione ao menos um módulo e um tipo de documento antes de criar as documentações.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const persisted = await persistDocumentacaoFlow(flow)
      setPersistenceResult(persisted)
      setResult(persisted)
    } catch (persistError) {
      console.log(persistError)
      setError(persistError.message || 'Nao foi possivel salvar as documentações.')
    } finally {
      setLoading(false)
    }
  }

  if (flow.serviceId !== currentServiceId) {
    return (
      <PageShell narrow>
        <SurfaceCard>
          <span className="muted">Validando fluxo da qualificação...</span>
        </SurfaceCard>
      </PageShell>
    )
  }

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Qualificação"
        title="Resumo da criação"
        description="Confira como as documentações serão geradas antes de persistir o conjunto final."
        meta={
          <>
            <span className="badge badge--primary">Serviço #{params.id}</span>
            <span className="badge">{flow.quantidadeSistemas} sistemas</span>
            <span className="badge">{formatarModoCriacaoDocumentacao(flow.modoCriacaoDocumentacao)}</span>
            <span className="badge">{flow.totalDocuments} documentos</span>
            {flow.dadosGerais.empresa?.nome ? <span className="badge">{flow.dadosGerais.empresa.nome}</span> : null}
          </>
        }
      />

      <SurfaceCard className="surface-card--hero">
        <div className="stack-lg">
          <div className="surface-card__header">
            <div>
              <h2 className="surface-card__title">Plano de documentações</h2>
              <p className="surface-card__subtitle">
                A montagem agora é centralizada e neutra entre IQ, OQ e PQ, considerando modo de criação, sistemas e tipo de documento.
              </p>
            </div>
          </div>

          {flow.plan.length === 0 || flow.totalDocuments === 0 ? (
            <EmptyState
              title="Nenhuma documentação configurada"
              description="Volte para os dados gerais e marque pelo menos um tipo de qualificação com Protocolo e/ou Relatório."
            />
          ) : (
            <div className="documentation-plan">
              {flow.plan.map((group) => (
                <SurfaceCard key={group.id}>
                  <div className="surface-card__header">
                    <div>
                      <h3 className="surface-card__title">{group.title}</h3>
                      <p className="surface-card__subtitle">{group.description}</p>
                    </div>
                    <div className="cluster">
                      {group.systems.map((system) => (
                        <span key={system.localId} className="badge">
                          {system.nome}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="documentation-plan__list">
                    {group.documentos.map((document) => (
                      <div key={`${group.id}-${document.documentTypeId}-${document.qualificationTypeId}`} className="plan-item">
                        <div>
                          <strong>
                            {formatDocumentType(document.documentTypeId)} {formatQualificationType(document.qualificationTypeId)}
                          </strong>
                          <p className="muted">{document.title}</p>
                        </div>
                        <span className="badge">{document.code || 'Sem código informado'}</span>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}

          {error ? <p className="feedback-text feedback-text--error">{error}</p> : null}

          {Object.entries(modelAttachments).some(([, attachments]) => attachments.length > 0) ? (
            <div className="stack-lg">
              <div className="surface-card__header">
                <div>
                  <h3 className="surface-card__title">Anexos do modelo</h3>
                  <p className="surface-card__subtitle">
                    Escolha quais anexos do modelo de {flow.modalidadeQualificacao} entrarão em cada etapa da documentação.
                  </p>
                </div>
              </div>

              {Object.entries(modelAttachments).map(([qualificationTypeId, attachments]) => {
                if (attachments.length === 0) {
                  return null
                }

                const selectedAttachments = flow.modeloAnexosSelecionados?.[qualificationTypeId] || []

                return (
                  <SurfaceCard key={qualificationTypeId}>
                    <div className="surface-card__header">
                      <div>
                        <h4 className="surface-card__title">
                          {flow.modalidadeQualificacao} {formatQualificationType(qualificationTypeId)}
                        </h4>
                        <p className="surface-card__subtitle">
                          Marque os anexos que devem ser clonados do modelo para a documentação final.
                        </p>
                      </div>
                    </div>

                    <div className="stack">
                      {attachments.map((attachment) => {
                        const checked = selectedAttachments.some(
                          (item) => item.nome === attachment.nome
                        )

                        return (
                          <label key={attachment.nome} className="checkbox-field">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const nextAttachments = event.target.checked
                                  ? [...selectedAttachments, attachment]
                                  : selectedAttachments.filter(
                                      (item) => item.nome !== attachment.nome
                                    )

                                setTemplateAttachments(qualificationTypeId, nextAttachments)
                              }}
                            />
                            <span>{attachment.nome}</span>
                          </label>
                        )
                      })}
                    </div>
                  </SurfaceCard>
                )
              })}
            </div>
          ) : null}

          <div className="form-actions">
            <button className="btn btn--primary" onClick={handleCreateDocumentacoes} disabled={loading}>
              {loading ? 'Salvando...' : 'Criar documentações'}
            </button>
            <button className="btn btn--ghost" onClick={() => router.push(`/dashboard/servico/${params.id}/documentacao/qualificacao/dados-gerais`)}>
              Voltar para edição
            </button>
          </div>
        </div>
      </SurfaceCard>

      {result ? (
        <SurfaceCard>
          <div className="stack">
            <div className="surface-card__header">
              <div>
                <h2 className="surface-card__title">Documentações salvas</h2>
                <p className="surface-card__subtitle">
                  Os registros foram persistidos e já podem ser acessados individualmente.
                </p>
              </div>
            </div>

            <div className="documentation-plan__list">
              {result.documentacoes.map((documentacao) => (
                <div key={documentacao.id} className="plan-item">
                  <div>
                    <strong>{documentacao.titulo}</strong>
                    <p className="muted">
                      {documentacao.tipo}
                      {documentacao.codigo ? ` • ${documentacao.codigo}` : ''}
                    </p>
                  </div>
                  <Link className="btn btn--secondary" href={`/dashboard/documentacoes/${documentacao.id}`}>
                    Abrir documentação
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>
      ) : null}
    </PageShell>
  )
}
