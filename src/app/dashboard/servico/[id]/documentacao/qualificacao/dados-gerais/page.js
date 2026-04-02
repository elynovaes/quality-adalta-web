'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Field, PageHeader, PageShell, SurfaceCard } from '@/components/ui'
import { formatarModoCriacaoDocumentacao, formatarTipoQualificacao } from '@/lib/qualificacao'
import { useDocumentacaoFlowStore, useDocumentacaoFlowViewModel } from '@/stores/documentacao-flow-store'
import { removeClientLogo, uploadClientLogo } from '@/features/documentacao/services/uploadLogoService'
import { fetchServicoResumo } from '@/features/documentacao/services/servicoResumoService'
import { qualificationTypeIds } from '@/features/documentacao/config/qualificationConfig'
import { createEmptyDocumentSelection } from '@/types/documentacao-flow'

function SectionFields({ title, description, children }) {
  return (
    <div className="stack">
      <div className="surface-card__header">
        <div>
          <h3 className="surface-card__title">{title}</h3>
          {description ? <p className="surface-card__subtitle">{description}</p> : null}
        </div>
      </div>
      {children}
    </div>
  )
}

export default function DadosGeraisQualificacaoPage() {
  const params = useParams()
  const router = useRouter()
  const {
    hydratePersistedFlow,
    setServiceSnapshot,
    updateGeneralData,
    setLogoUploadStatus,
    setLogoCliente,
    updateSystemName,
    updateDocumentSelection,
  } = useDocumentacaoFlowStore()
  const flow = useDocumentacaoFlowViewModel()
  const [activeSystemIndex, setActiveSystemIndex] = useState(0)

  useEffect(() => {
    if (flow.serviceId === Number(params.id)) {
      return
    }

    const hydrated = hydratePersistedFlow(Number(params.id))

    if (!hydrated) {
      fetchServicoResumo(Number(params.id))
        .then((resumo) => {
          setServiceSnapshot({
            id: resumo.id,
            os: resumo.os,
            cliente: resumo.cliente,
            sistema: resumo.sistema,
          })
        })
        .catch((error) => {
          console.log(error)
        })
    }
  }, [flow.serviceId, hydratePersistedFlow, params.id, setServiceSnapshot])

  const configuracaoAtual =
    flow.modoCriacaoDocumentacao === 'agrupado'
      ? flow.groupedDocuments
      : flow.sistemas[activeSystemIndex]?.documentosQualificacao || {}

  function updateDocumentConfig(typeId, updater) {
    const currentValue = configuracaoAtual[typeId] || createEmptyDocumentSelection()
    const nextValue = updater(currentValue)

    updateDocumentSelection({
      scope: flow.modoCriacaoDocumentacao === 'agrupado' ? 'grouped' : 'system',
      index: activeSystemIndex,
      typeId,
      value: nextValue,
    })
  }

  async function handleLogoChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      setLogoCliente(null)
      return
    }

    setLogoUploadStatus({ uploading: true, error: '' })

    try {
      const uploaded = await uploadClientLogo({
        serviceId: Number(params.id),
        file,
        previousStoragePath: flow.dadosGerais.logoCliente?.storagePath || null,
      })

      setLogoCliente(uploaded)
    } catch (error) {
      console.log(error)
      setLogoUploadStatus({
        uploading: false,
        error: error.message || 'Nao foi possivel enviar a logo.',
      })
    }
  }

  async function handleRemoveLogo() {
    try {
      setLogoUploadStatus({ uploading: true, error: '' })

      if (flow.dadosGerais.logoCliente?.storagePath) {
        await removeClientLogo(flow.dadosGerais.logoCliente.storagePath)
      }

      setLogoCliente(null)
    } catch (error) {
      console.log(error)
      setLogoUploadStatus({
        uploading: false,
        error: error.message || 'Nao foi possivel remover a logo.',
      })
    }
  }

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Qualificação"
        title="Dados gerais"
        description="Preencha os dados institucionais que serão reutilizados nas documentações, relatórios e PDFs."
        meta={
          <>
            <span className="badge badge--primary">Serviço #{params.id}</span>
            <span className="badge">{flow.quantidadeSistemas} sistemas</span>
            <span className="badge">{formatarModoCriacaoDocumentacao(flow.modoCriacaoDocumentacao)}</span>
            {flow.os ? <span className="badge">OS {flow.os}</span> : null}
          </>
        }
      />

      <SurfaceCard className="surface-card--hero">
        <div className="stack-lg">
          <SectionFields
            title="Empresa"
            description="Esses dados identificam a empresa responsável pela documentação."
          >
            <div className="form-grid">
              <Field label="Nome da Empresa">
                <input
                  id="empresa-nome"
                  className="input"
                  value={flow.dadosGerais.empresa.nome}
                  onChange={(event) => updateGeneralData('empresa', { nome: event.target.value })}
                />
              </Field>

              <Field label="Endereço da Empresa">
                <input
                  id="empresa-endereco"
                  className="input"
                  value={flow.dadosGerais.empresa.endereco}
                  onChange={(event) => updateGeneralData('empresa', { endereco: event.target.value })}
                />
              </Field>

              <Field label="CEP">
                <input
                  id="empresa-cep"
                  className="input"
                  value={flow.dadosGerais.empresa.cep}
                  onChange={(event) => updateGeneralData('empresa', { cep: event.target.value })}
                />
              </Field>
            </div>
          </SectionFields>

          <SectionFields title="Elaboração">
            <div className="form-grid">
              <Field label="Nome do Elaborador">
                <input
                  id="elaborador-nome"
                  className="input"
                  value={flow.dadosGerais.elaborador.nome}
                  onChange={(event) => updateGeneralData('elaborador', { nome: event.target.value })}
                />
              </Field>

              <Field label="Cargo do Elaborador">
                <input
                  id="elaborador-cargo"
                  className="input"
                  value={flow.dadosGerais.elaborador.cargo}
                  onChange={(event) => updateGeneralData('elaborador', { cargo: event.target.value })}
                />
              </Field>
            </div>
          </SectionFields>

          <SectionFields title="Revisão">
            <div className="form-grid">
              <Field label="Nome do Revisor">
                <input
                  id="revisor-nome"
                  className="input"
                  value={flow.dadosGerais.revisor.nome}
                  onChange={(event) => updateGeneralData('revisor', { nome: event.target.value })}
                />
              </Field>

              <Field label="Cargo do Revisor">
                <input
                  id="revisor-cargo"
                  className="input"
                  value={flow.dadosGerais.revisor.cargo}
                  onChange={(event) => updateGeneralData('revisor', { cargo: event.target.value })}
                />
              </Field>
            </div>
          </SectionFields>

          <SectionFields title="Aprovação">
            <div className="form-grid">
              <Field label="Nome do Aprovador">
                <input
                  id="aprovador-nome"
                  className="input"
                  value={flow.dadosGerais.aprovador.nome}
                  onChange={(event) => updateGeneralData('aprovador', { nome: event.target.value })}
                />
              </Field>

              <Field label="Cargo do Aprovador">
                <input
                  id="aprovador-cargo"
                  className="input"
                  value={flow.dadosGerais.aprovador.cargo}
                  onChange={(event) => updateGeneralData('aprovador', { cargo: event.target.value })}
                />
              </Field>

              <Field label="Telefone de contato do Aprovador">
                <input
                  id="aprovador-telefone"
                  className="input"
                  value={flow.dadosGerais.aprovador.telefone}
                  onChange={(event) => updateGeneralData('aprovador', { telefone: event.target.value })}
                />
              </Field>

              <Field label="Email do Aprovador">
                <input
                  id="aprovador-email"
                  className="input"
                  type="email"
                  value={flow.dadosGerais.aprovador.email}
                  onChange={(event) => updateGeneralData('aprovador', { email: event.target.value })}
                />
              </Field>
            </div>
          </SectionFields>

          <SectionFields
            title="Logo do Cliente"
            description="Aceita PNG e JPG. A imagem é enviada ao Supabase Storage e reaproveitada depois no PDF."
          >
            <div className="stack">
              <Field label="Upload da imagem" hint="Formatos aceitos: PNG e JPG, até 2 MB">
                <input
                  id="logoCliente"
                  className="input input--file"
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={handleLogoChange}
                  disabled={flow.logoUpload.uploading}
                />
              </Field>

              {flow.logoUpload.error ? (
                <p className="feedback-text feedback-text--error">{flow.logoUpload.error}</p>
              ) : null}

              {flow.logoUpload.uploading ? <p className="muted">Enviando logo...</p> : null}

              {flow.dadosGerais.logoCliente?.publicUrl ? (
                <div className="logo-preview-card">
                  <Image
                    src={flow.dadosGerais.logoCliente.publicUrl}
                    alt="Preview da logo do cliente"
                    className="logo-preview-card__image"
                    width={280}
                    height={140}
                    unoptimized
                  />
                  <button type="button" className="btn btn--ghost" onClick={handleRemoveLogo}>
                    Remover logo
                  </button>
                </div>
              ) : null}
            </div>
          </SectionFields>

          <div className="stack">
            <div className="surface-card__header">
              <div>
                <h3 className="surface-card__title">Sistemas da qualificação</h3>
                <p className="surface-card__subtitle">
                  Nomeie os sistemas que serão incluídos no fluxo. Esses nomes serão usados na geração final das documentações.
                </p>
              </div>
            </div>

            <div className="form-grid">
              {flow.sistemas.map((system, index) => (
                <Field key={system.localId} label={`Sistema ${String(system.systemNumber).padStart(2, '0')}`}>
                  <input
                    id={`system-name-${system.systemNumber}`}
                    className="input"
                    value={system.nome}
                    onChange={(event) => updateSystemName(index, event.target.value)}
                  />
                </Field>
              ))}
            </div>
          </div>

          <div className="stack-lg">
            <div className="surface-card__header">
              <div>
                <h3 className="surface-card__title">Documentos da qualificação</h3>
                <p className="surface-card__subtitle">
                  {flow.modoCriacaoDocumentacao === 'agrupado'
                    ? 'A configuração abaixo será compartilhada por todos os sistemas informados.'
                    : 'Cada sistema mantém sua própria combinação de IQ, OQ, PQ, Protocolo e Relatório.'}
                </p>
              </div>
            </div>

            {flow.modoCriacaoDocumentacao === 'por_sistema' ? (
              <div className="tabs-row" role="tablist" aria-label="Sistemas da qualificação">
                {flow.sistemas.map((system, index) => (
                  <button
                    key={system.localId}
                    type="button"
                    role="tab"
                    aria-selected={activeSystemIndex === index}
                    className={`tab-button ${activeSystemIndex === index ? 'tab-button--active' : ''}`}
                    onClick={() => setActiveSystemIndex(index)}
                  >
                    {system.nome}
                  </button>
                ))}
              </div>
            ) : (
              <div className="group-summary">
                <span className="badge badge--primary">Modo agrupado</span>
                <span className="muted">{flow.sistemas.map((system) => system.nome).join(' • ')}</span>
              </div>
            )}

            <div className="split-grid">
              {qualificationTypeIds.map((typeId) => {
                const currentValue = configuracaoAtual[typeId] || createEmptyDocumentSelection()

                return (
                  <div key={typeId} className="split-grid__side stack">
                    <button
                      type="button"
                      className={`option-card option-card--selectable ${currentValue.ativo ? 'option-card--active' : ''}`}
                      onClick={() =>
                        updateDocumentConfig(typeId, (documentoAtual) => ({
                          ...documentoAtual,
                          ativo: !documentoAtual.ativo,
                          protocoloSelecionado: !documentoAtual.ativo
                            ? documentoAtual.protocoloSelecionado
                            : false,
                          relatorioSelecionado: !documentoAtual.ativo
                            ? documentoAtual.relatorioSelecionado
                            : false,
                        }))
                      }
                    >
                      <span className="option-card__title">{formatarTipoQualificacao(typeId)}</span>
                      <span className="option-card__description">
                        Selecione este tipo para habilitar Protocolo, Relatório ou ambos.
                      </span>
                    </button>

                    {currentValue.ativo ? (
                      <SurfaceCard>
                        <div className="stack">
                          <div className="toggle-row">
                            <button
                              type="button"
                              className={`toggle-chip ${currentValue.protocoloSelecionado ? 'toggle-chip--active' : ''}`}
                              onClick={() =>
                                updateDocumentConfig(typeId, (documentoAtual) => ({
                                  ...documentoAtual,
                                  protocoloSelecionado: !documentoAtual.protocoloSelecionado,
                                }))
                              }
                            >
                              Protocolo
                            </button>
                            <button
                              type="button"
                              className={`toggle-chip ${currentValue.relatorioSelecionado ? 'toggle-chip--active' : ''}`}
                              onClick={() =>
                                updateDocumentConfig(typeId, (documentoAtual) => ({
                                  ...documentoAtual,
                                  relatorioSelecionado: !documentoAtual.relatorioSelecionado,
                                }))
                              }
                            >
                              Relatório
                            </button>
                          </div>

                          {currentValue.protocoloSelecionado ? (
                            <Field label={`Código do Protocolo de ${formatarTipoQualificacao(typeId)}`}>
                              <input
                                className="input"
                                value={currentValue.protocoloCodigo}
                                onChange={(event) =>
                                  updateDocumentConfig(typeId, (documentoAtual) => ({
                                    ...documentoAtual,
                                    protocoloCodigo: event.target.value,
                                  }))
                                }
                              />
                            </Field>
                          ) : null}

                          {currentValue.relatorioSelecionado ? (
                            <Field label={`Código do Relatório de ${formatarTipoQualificacao(typeId)}`}>
                              <input
                                className="input"
                                value={currentValue.relatorioCodigo}
                                onChange={(event) =>
                                  updateDocumentConfig(typeId, (documentoAtual) => ({
                                    ...documentoAtual,
                                    relatorioCodigo: event.target.value,
                                  }))
                                }
                              />
                            </Field>
                          ) : null}
                        </div>
                      </SurfaceCard>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn--primary" onClick={() => router.push(`/dashboard/servico/${params.id}/documentacao/qualificacao`)}>
              Continuar
            </button>
            <button className="btn btn--ghost" onClick={() => router.push(`/dashboard/servico/${params.id}/documentacao`)}>
              Voltar
            </button>
          </div>
        </div>
      </SurfaceCard>
    </PageShell>
  )
}
