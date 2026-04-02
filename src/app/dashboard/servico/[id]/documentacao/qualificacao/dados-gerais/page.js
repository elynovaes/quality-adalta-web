'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Field, PageHeader, PageShell, SurfaceCard } from '../../../../../../../components/ui'
import { carregarFluxoQualificacaoLocal, salvarFluxoQualificacaoLocal } from '../../../../../../../lib/qualificacao-storage'
import {
  criarConfiguracaoDocumentosVazia,
  criarListaSistemas,
  formatarModoCriacaoDocumentacao,
  formatarTipoQualificacao,
  normalizarConfiguracaoDocumentos,
  normalizarGeneralData,
  normalizarSistema,
  parseJsonParam,
  serializarFluxoQualificacao,
  TIPOS_QUALIFICACAO,
} from '../../../../../../../lib/qualificacao'

const TIPOS_LOGO_ACEITOS = ['image/png', 'image/jpeg']

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
  const searchParams = useSearchParams()
  const numeroSistemas = Number(searchParams.get('numeroSistemas') || '1')
  const modoCriacaoDocumentacao = searchParams.get('modoCriacaoDocumentacao') || 'agrupado'
  const systemsDataParam = searchParams.get('systemsData')
  const generalDataParam = searchParams.get('generalData')
  const groupedDocumentsParam = searchParams.get('groupedDocuments')
  const fluxoPersistido =
    typeof window === 'undefined' ? null : carregarFluxoQualificacaoLocal(params.id)

  const [generalData, setGeneralData] = useState(() =>
    normalizarGeneralData(parseJsonParam(generalDataParam, null) || fluxoPersistido?.generalData || null)
  )

  const [systems, setSystems] = useState(() => {
    const parsedSystems = parseJsonParam(systemsDataParam, null) || fluxoPersistido?.systems || null

    if (Array.isArray(parsedSystems) && parsedSystems.length > 0) {
      return parsedSystems.map((system, index) => normalizarSistema(system, index))
    }

    return criarListaSistemas(numeroSistemas)
  })

  const [groupedDocuments, setGroupedDocuments] = useState(() =>
    normalizarConfiguracaoDocumentos(
      parseJsonParam(groupedDocumentsParam, null) ||
        fluxoPersistido?.groupedDocuments ||
        systems[0]?.documentosQualificacao ||
        criarConfiguracaoDocumentosVazia()
    )
  )
  const [activeSystemIndex, setActiveSystemIndex] = useState(0)
  const [erroLogo, setErroLogo] = useState('')

  const sistemaAtual = systems[activeSystemIndex]
  const configuracaoAtual =
    modoCriacaoDocumentacao === 'agrupado'
      ? groupedDocuments
      : sistemaAtual?.documentosQualificacao || criarConfiguracaoDocumentosVazia()

  function atualizarCampo(path, value) {
    setGeneralData((currentData) => ({
      ...currentData,
      [path]: {
        ...currentData[path],
        ...value,
      },
    }))
  }

  function atualizarLogoCliente(value) {
    setGeneralData((currentData) => ({
      ...currentData,
      logoCliente: value,
    }))
  }

  function atualizarNomeSistema(index, value) {
    setSystems((currentSystems) =>
      currentSystems.map((system, systemIndex) =>
        systemIndex === index
          ? {
              ...system,
              nome: value,
            }
          : system
      )
    )
  }

  function atualizarConfiguracaoDocumento(tipoDocumento, updater) {
    if (modoCriacaoDocumentacao === 'agrupado') {
      setGroupedDocuments((currentConfig) => ({
        ...currentConfig,
        [tipoDocumento]: updater(currentConfig[tipoDocumento]),
      }))
      return
    }

    setSystems((currentSystems) =>
      currentSystems.map((system, index) => {
        if (index !== activeSystemIndex) {
          return system
        }

        return {
          ...system,
          documentosQualificacao: {
            ...system.documentosQualificacao,
            [tipoDocumento]: updater(system.documentosQualificacao[tipoDocumento]),
          },
        }
      })
    )
  }

  function atualizarCodigoDocumento(tipoDocumento, tipoArquivo, value) {
    atualizarConfiguracaoDocumento(tipoDocumento, (documentoAtual) => ({
      ...documentoAtual,
      [tipoArquivo]: value,
    }))
  }

  function alternarTipoDocumento(tipoDocumento) {
    atualizarConfiguracaoDocumento(tipoDocumento, (documentoAtual) => {
      const proximoAtivo = !documentoAtual.ativo

      return {
        ...documentoAtual,
        ativo: proximoAtivo,
        protocoloSelecionado: proximoAtivo ? documentoAtual.protocoloSelecionado : false,
        relatorioSelecionado: proximoAtivo ? documentoAtual.relatorioSelecionado : false,
      }
    })
  }

  function alternarTipoArquivo(tipoDocumento, tipoArquivo) {
    atualizarConfiguracaoDocumento(tipoDocumento, (documentoAtual) => {
      if (!documentoAtual.ativo) {
        return documentoAtual
      }

      return {
        ...documentoAtual,
        [tipoArquivo]: !documentoAtual[tipoArquivo],
      }
    })
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      atualizarLogoCliente('')
      setErroLogo('')
      return
    }

    if (!TIPOS_LOGO_ACEITOS.includes(file.type)) {
      setErroLogo('Envie uma imagem PNG ou JPG.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      atualizarLogoCliente(String(reader.result || ''))
      setErroLogo('')
    }

    reader.onerror = () => {
      setErroLogo('Nao foi possivel ler a imagem selecionada.')
    }

    reader.readAsDataURL(file)
  }

  function continuarParaResumo() {
    const payloadFluxo = {
      numeroSistemas,
      modoCriacaoDocumentacao,
      generalData,
      systems,
      groupedDocuments,
    }

    salvarFluxoQualificacaoLocal(params.id, payloadFluxo)

    const paramsToSend = serializarFluxoQualificacao({
      numeroSistemas,
      modoCriacaoDocumentacao,
      systems,
      groupedDocuments,
    })

    router.push(`/dashboard/servico/${params.id}/documentacao/qualificacao?${paramsToSend.toString()}`)
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
            <span className="badge">{numeroSistemas} sistemas</span>
            <span className="badge">{formatarModoCriacaoDocumentacao(modoCriacaoDocumentacao)}</span>
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
                  value={generalData.empresa.nome}
                  onChange={(event) => atualizarCampo('empresa', { nome: event.target.value })}
                />
              </Field>

              <Field label="Endereço da Empresa">
                <input
                  id="empresa-endereco"
                  className="input"
                  value={generalData.empresa.endereco}
                  onChange={(event) => atualizarCampo('empresa', { endereco: event.target.value })}
                />
              </Field>

              <Field label="CEP">
                <input
                  id="empresa-cep"
                  className="input"
                  value={generalData.empresa.cep}
                  onChange={(event) => atualizarCampo('empresa', { cep: event.target.value })}
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
                  value={generalData.elaborador.nome}
                  onChange={(event) => atualizarCampo('elaborador', { nome: event.target.value })}
                />
              </Field>

              <Field label="Cargo do Elaborador">
                <input
                  id="elaborador-cargo"
                  className="input"
                  value={generalData.elaborador.cargo}
                  onChange={(event) => atualizarCampo('elaborador', { cargo: event.target.value })}
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
                  value={generalData.revisor.nome}
                  onChange={(event) => atualizarCampo('revisor', { nome: event.target.value })}
                />
              </Field>

              <Field label="Cargo do Revisor">
                <input
                  id="revisor-cargo"
                  className="input"
                  value={generalData.revisor.cargo}
                  onChange={(event) => atualizarCampo('revisor', { cargo: event.target.value })}
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
                  value={generalData.aprovador.nome}
                  onChange={(event) => atualizarCampo('aprovador', { nome: event.target.value })}
                />
              </Field>

              <Field label="Cargo do Aprovador">
                <input
                  id="aprovador-cargo"
                  className="input"
                  value={generalData.aprovador.cargo}
                  onChange={(event) => atualizarCampo('aprovador', { cargo: event.target.value })}
                />
              </Field>

              <Field label="Telefone de contato do Aprovador">
                <input
                  id="aprovador-telefone"
                  className="input"
                  value={generalData.aprovador.telefone}
                  onChange={(event) => atualizarCampo('aprovador', { telefone: event.target.value })}
                />
              </Field>

              <Field label="Email do Aprovador">
                <input
                  id="aprovador-email"
                  className="input"
                  type="email"
                  value={generalData.aprovador.email}
                  onChange={(event) => atualizarCampo('aprovador', { email: event.target.value })}
                />
              </Field>
            </div>
          </SectionFields>

          <SectionFields
            title="Logo do Cliente"
            description="Aceita PNG e JPG. A imagem fica com preview imediato e a referência segue para uso posterior no PDF."
          >
            <div className="stack">
              <Field label="Upload da imagem" hint="Formatos aceitos: PNG e JPG">
                <input
                  id="logoCliente"
                  className="input input--file"
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={handleLogoChange}
                />
              </Field>

              {erroLogo ? <p className="feedback-text feedback-text--error">{erroLogo}</p> : null}

              {generalData.logoCliente ? (
                <div className="logo-preview-card">
                  <Image
                    src={generalData.logoCliente}
                    alt="Preview da logo do cliente"
                    className="logo-preview-card__image"
                    width={280}
                    height={140}
                    unoptimized
                  />
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => atualizarLogoCliente('')}
                  >
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
              {systems.map((system, index) => (
                <Field key={system.systemNumber} label={`Sistema ${String(system.systemNumber).padStart(2, '0')}`}>
                  <input
                    id={`system-name-${system.systemNumber}`}
                    className="input"
                    value={system.nome}
                    onChange={(event) => atualizarNomeSistema(index, event.target.value)}
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
                  {modoCriacaoDocumentacao === 'agrupado'
                    ? 'A configuração abaixo será compartilhada por todos os sistemas informados.'
                    : 'Cada sistema mantém sua própria combinação de IQ, OQ, PQ, Protocolo e Relatório.'}
                </p>
              </div>
            </div>

            {modoCriacaoDocumentacao === 'por_sistema' ? (
              <div className="tabs-row" role="tablist" aria-label="Sistemas da qualificação">
                {systems.map((system, index) => (
                  <button
                    key={system.systemNumber}
                    type="button"
                    role="tab"
                    aria-selected={activeSystemIndex === index}
                    className={`tab-button ${activeSystemIndex === index ? 'tab-button--active' : ''}`}
                    onClick={() => setActiveSystemIndex(index)}
                  >
                    {system.nome || `Sistema ${String(system.systemNumber).padStart(2, '0')}`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="group-summary">
                <span className="badge badge--primary">Modo agrupado</span>
                <span className="muted">
                  {systems.map((system) => system.nome || `Sistema ${system.systemNumber}`).join(' • ')}
                </span>
              </div>
            )}

            <div className="split-grid">
              {TIPOS_QUALIFICACAO.map((tipoDocumento) => {
                const documentoAtual = configuracaoAtual[tipoDocumento]

                return (
                  <div key={tipoDocumento} className="split-grid__side stack">
                    <button
                      type="button"
                      className={`option-card option-card--selectable ${documentoAtual.ativo ? 'option-card--active' : ''}`}
                      onClick={() => alternarTipoDocumento(tipoDocumento)}
                    >
                      <span className="option-card__title">{formatarTipoQualificacao(tipoDocumento)}</span>
                      <span className="option-card__description">
                        Selecione este tipo para habilitar Protocolo, Relatório ou ambos.
                      </span>
                    </button>

                    {documentoAtual.ativo ? (
                      <SurfaceCard>
                        <div className="stack">
                          <div className="toggle-row">
                            <button
                              type="button"
                              className={`toggle-chip ${documentoAtual.protocoloSelecionado ? 'toggle-chip--active' : ''}`}
                              onClick={() => alternarTipoArquivo(tipoDocumento, 'protocoloSelecionado')}
                            >
                              Protocolo
                            </button>
                            <button
                              type="button"
                              className={`toggle-chip ${documentoAtual.relatorioSelecionado ? 'toggle-chip--active' : ''}`}
                              onClick={() => alternarTipoArquivo(tipoDocumento, 'relatorioSelecionado')}
                            >
                              Relatório
                            </button>
                          </div>

                          {documentoAtual.protocoloSelecionado ? (
                            <Field label={`Código do Protocolo de ${formatarTipoQualificacao(tipoDocumento)}`}>
                              <input
                                id={`${tipoDocumento}-protocolo-${modoCriacaoDocumentacao}-${sistemaAtual?.systemNumber || 'grupo'}`}
                                className="input"
                                value={documentoAtual.protocoloCodigo}
                                onChange={(event) =>
                                  atualizarCodigoDocumento(tipoDocumento, 'protocoloCodigo', event.target.value)
                                }
                              />
                            </Field>
                          ) : null}

                          {documentoAtual.relatorioSelecionado ? (
                            <Field label={`Código do Relatório de ${formatarTipoQualificacao(tipoDocumento)}`}>
                              <input
                                id={`${tipoDocumento}-relatorio-${modoCriacaoDocumentacao}-${sistemaAtual?.systemNumber || 'grupo'}`}
                                className="input"
                                value={documentoAtual.relatorioCodigo}
                                onChange={(event) =>
                                  atualizarCodigoDocumento(tipoDocumento, 'relatorioCodigo', event.target.value)
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
            <button className="btn btn--primary" onClick={continuarParaResumo}>
              Continuar
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => router.push(`/dashboard/servico/${params.id}/documentacao`)}
            >
              Voltar
            </button>
          </div>
        </div>
      </SurfaceCard>
    </PageShell>
  )
}
