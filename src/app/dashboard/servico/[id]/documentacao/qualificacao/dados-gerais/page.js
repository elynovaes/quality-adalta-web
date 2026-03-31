'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Field, PageHeader, PageShell, SurfaceCard } from '../../../../../../../components/ui'

const TIPOS_DOCUMENTO = ['iq', 'oq', 'pq']

function criarDocumentoQualificacaoVazio() {
  return {
    ativo: false,
    protocoloSelecionado: false,
    relatorioSelecionado: false,
    protocoloCodigo: '',
    relatorioCodigo: '',
  }
}

function criarSistemaVazio(systemNumber) {
  return {
    systemNumber,
    documentosQualificacao: {
      iq: criarDocumentoQualificacaoVazio(),
      oq: criarDocumentoQualificacaoVazio(),
      pq: criarDocumentoQualificacaoVazio(),
    },
  }
}

function normalizarSistema(system, index) {
  const documentosQualificacao = TIPOS_DOCUMENTO.reduce((acc, tipo) => {
    const documentoAtual = system?.documentosQualificacao?.[tipo] || {}

    acc[tipo] = {
      ...criarDocumentoQualificacaoVazio(),
      ...documentoAtual,
    }

    return acc
  }, {})

  return {
    systemNumber: system?.systemNumber || index + 1,
    documentosQualificacao,
  }
}

function formatarTipoDocumento(tipo) {
  return tipo.toUpperCase()
}

export default function DadosGeraisQualificacaoPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const numeroSistemas = Number(searchParams.get('numeroSistemas') || '1')
  const systemsDataParam = searchParams.get('systemsData')
  const generalDataParam = searchParams.get('generalData')

  const [generalData, setGeneralData] = useState(() => {
    if (generalDataParam) {
      try {
        return {
          cliente: '',
          projeto: '',
          unidadeLocal: '',
          responsavelElaboracao: '',
          responsavelRevisao: '',
          dataEmissao: '',
          observacoesGerais: '',
          ...JSON.parse(generalDataParam),
        }
      } catch (error) {
        console.log(error)
      }
    }

    if (systemsDataParam) {
      try {
        const parsedSystems = JSON.parse(systemsDataParam)
        const legacyDadosGerais = parsedSystems?.[0]?.dadosGerais

        if (legacyDadosGerais) {
          return {
            cliente: legacyDadosGerais.cliente || '',
            projeto: legacyDadosGerais.projeto || '',
            unidadeLocal: legacyDadosGerais.unidadeLocal || '',
            responsavelElaboracao: legacyDadosGerais.responsavelElaboracao || '',
            responsavelRevisao: legacyDadosGerais.responsavelRevisao || '',
            dataEmissao: legacyDadosGerais.dataEmissao || '',
            observacoesGerais: legacyDadosGerais.observacoesGerais || '',
          }
        }
      } catch (error) {
        console.log(error)
      }
    }

    return {
      cliente: '',
      projeto: '',
      unidadeLocal: '',
      responsavelElaboracao: '',
      responsavelRevisao: '',
      dataEmissao: '',
      observacoesGerais: '',
    }
  })

  const [systems, setSystems] = useState(() => {
    if (systemsDataParam) {
      try {
        const parsedSystems = JSON.parse(systemsDataParam)

        if (Array.isArray(parsedSystems) && parsedSystems.length > 0) {
          return parsedSystems.map((system, index) => normalizarSistema(system, index))
        }
      } catch (error) {
        console.log(error)
      }
    }

    return Array.from({ length: numeroSistemas }, (_, index) => criarSistemaVazio(index + 1))
  })
  const [activeSystemIndex, setActiveSystemIndex] = useState(0)

  const sistemaAtual = systems[activeSystemIndex]

  function atualizarCampo(field, value) {
    setGeneralData((currentData) => ({
      ...currentData,
      [field]: value,
    }))
  }

  function atualizarCodigoDocumento(tipoDocumento, tipoArquivo, value) {
    setSystems((currentSystems) =>
      currentSystems.map((system, index) => {
        if (index !== activeSystemIndex) {
          return system
        }

        return {
          ...system,
          documentosQualificacao: {
            ...system.documentosQualificacao,
            [tipoDocumento]: {
              ...system.documentosQualificacao[tipoDocumento],
              [tipoArquivo]: value,
            },
          },
        }
      })
    )
  }

  function alternarTipoDocumento(tipoDocumento) {
    setSystems((currentSystems) =>
      currentSystems.map((system, index) => {
        if (index !== activeSystemIndex) {
          return system
        }

        const documentoAtual = system.documentosQualificacao[tipoDocumento]
        const proximoAtivo = !documentoAtual.ativo

        return {
          ...system,
          documentosQualificacao: {
            ...system.documentosQualificacao,
            [tipoDocumento]: {
              ...documentoAtual,
              ativo: proximoAtivo,
              protocoloSelecionado: proximoAtivo ? documentoAtual.protocoloSelecionado : false,
              relatorioSelecionado: proximoAtivo ? documentoAtual.relatorioSelecionado : false,
            },
          },
        }
      })
    )
  }

  function alternarTipoArquivo(tipoDocumento, tipoArquivo) {
    setSystems((currentSystems) =>
      currentSystems.map((system, index) => {
        if (index !== activeSystemIndex) {
          return system
        }

        const documentoAtual = system.documentosQualificacao[tipoDocumento]

        if (!documentoAtual.ativo) {
          return system
        }

        return {
          ...system,
          documentosQualificacao: {
            ...system.documentosQualificacao,
            [tipoDocumento]: {
              ...documentoAtual,
              [tipoArquivo]: !documentoAtual[tipoArquivo],
            },
          },
        }
      })
    )
  }

  function continuarParaTipos() {
    const paramsToSend = new URLSearchParams({
      numeroSistemas: String(numeroSistemas),
      generalData: JSON.stringify(generalData),
      systemsData: JSON.stringify(systems),
    })

    router.push(
      `/dashboard/servico/${params.id}/documentacao/qualificacao?${paramsToSend.toString()}`
    )
  }

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Qualificação"
        title="Dados gerais"
        description="Preencha as informações gerais da documentação antes de seguir para a escolha do tipo de documento."
        meta={
          <>
            <span className="badge badge--primary">Serviço #{params.id}</span>
            <span className="badge">{numeroSistemas} sistemas</span>
          </>
        }
      />

      <SurfaceCard className="surface-card--hero">
        <div className="stack-lg">
          <div className="surface-card__header">
            <div>
            <h2 className="surface-card__title">Informações da documentação</h2>
            <p className="surface-card__subtitle">
              Estes dados gerais são compartilhados por toda a documentação, independentemente do sistema ativo.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <Field label="Cliente">
            <input
              id="cliente"
              className="input"
              value={generalData.cliente}
              onChange={(event) => atualizarCampo('cliente', event.target.value)}
            />
          </Field>

          <Field label="Projeto">
            <input
              id="projeto"
              className="input"
              value={generalData.projeto}
              onChange={(event) => atualizarCampo('projeto', event.target.value)}
            />
          </Field>

          <Field label="Local / Unidade">
            <input
              id="unidadeLocal"
              className="input"
              value={generalData.unidadeLocal}
              onChange={(event) => atualizarCampo('unidadeLocal', event.target.value)}
            />
          </Field>

          <Field label="Responsável pela elaboração">
            <input
              id="responsavelElaboracao"
              className="input"
              value={generalData.responsavelElaboracao}
              onChange={(event) => atualizarCampo('responsavelElaboracao', event.target.value)}
            />
          </Field>

          <Field label="Responsável pela revisão">
            <input
              id="responsavelRevisao"
              className="input"
              value={generalData.responsavelRevisao}
              onChange={(event) => atualizarCampo('responsavelRevisao', event.target.value)}
            />
          </Field>

          <Field label="Data de emissão">
            <input
              id="dataEmissao"
              className="input"
              type="date"
              value={generalData.dataEmissao}
              onChange={(event) => atualizarCampo('dataEmissao', event.target.value)}
            />
          </Field>
        </div>

        <Field label="Observações gerais">
          <textarea
            id="observacoesGerais"
            className="textarea"
            value={generalData.observacoesGerais}
            onChange={(event) => atualizarCampo('observacoesGerais', event.target.value)}
          />
        </Field>

        <div className="stack">
          <div className="surface-card__header">
            <div>
              <h3 className="surface-card__title">Sistemas da qualificação</h3>
              <p className="surface-card__subtitle">
                Selecione abaixo o sistema que deseja configurar. Os dados gerais acima permanecem os mesmos para todos.
              </p>
            </div>
          </div>

          <div className="tabs-row" role="tablist" aria-label="Sistemas da qualificacao">
            {systems.map((system, index) => (
              <button
                key={system.systemNumber}
                type="button"
                role="tab"
                aria-selected={activeSystemIndex === index}
                className={`tab-button ${activeSystemIndex === index ? 'tab-button--active' : ''}`}
                onClick={() => setActiveSystemIndex(index)}
              >
                Sistema {String(system.systemNumber).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        <div className="stack-lg">
          <div className="surface-card__header">
            <div>
              <h3 className="surface-card__title">Documentos da Qualificação</h3>
              <p className="surface-card__subtitle">
                Cada documento possui um código próprio e independente para o sistema ativo.
              </p>
            </div>
          </div>

          <div className="split-grid">
            {TIPOS_DOCUMENTO.map((tipoDocumento) => {
              const documentoAtual = sistemaAtual.documentosQualificacao[tipoDocumento]

              return (
                <div key={tipoDocumento} className="split-grid__side stack">
                  <button
                    type="button"
                    className={`option-card option-card--selectable ${documentoAtual.ativo ? 'option-card--active' : ''}`}
                    onClick={() => alternarTipoDocumento(tipoDocumento)}
                  >
                    <span className="option-card__title">{formatarTipoDocumento(tipoDocumento)}</span>
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
                          <Field label={`Código do Protocolo de ${formatarTipoDocumento(tipoDocumento)}`}>
                            <input
                              id={`${tipoDocumento}-protocolo-${sistemaAtual.systemNumber}`}
                              className="input"
                              value={documentoAtual.protocoloCodigo}
                              onChange={(event) =>
                                atualizarCodigoDocumento(tipoDocumento, 'protocoloCodigo', event.target.value)
                              }
                            />
                          </Field>
                        ) : null}

                        {documentoAtual.relatorioSelecionado ? (
                          <Field label={`Código do Relatório de ${formatarTipoDocumento(tipoDocumento)}`}>
                            <input
                              id={`${tipoDocumento}-relatorio-${sistemaAtual.systemNumber}`}
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
          <button className="btn btn--primary" onClick={continuarParaTipos}>
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
