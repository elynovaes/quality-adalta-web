'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { salvarPlanoDocumentacoesQualificacao } from '../../../../../../lib/documentacoes'
import { carregarFluxoQualificacaoLocal, salvarFluxoQualificacaoLocal } from '../../../../../../lib/qualificacao-storage'
import {
  contarDocumentacoesPlano,
  formatarModoCriacaoDocumentacao,
  formatarTipoArquivo,
  formatarTipoQualificacao,
  gerarPlanoDocumentacoes,
  normalizarConfiguracaoDocumentos,
  normalizarGeneralData,
  normalizarSistema,
  parseJsonParam,
  serializarFluxoQualificacao,
} from '../../../../../../lib/qualificacao'
import { EmptyState, PageHeader, PageShell, SurfaceCard } from '../../../../../../components/ui'

export default function QualificacaoPage() {
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
  const [systems, setSystems] = useState(() =>
    (parseJsonParam(systemsDataParam, []) || fluxoPersistido?.systems || []).map((system, index) =>
      normalizarSistema(system, index)
    )
  )
  const [generalData, setGeneralData] = useState(() =>
    normalizarGeneralData(parseJsonParam(generalDataParam, null) || fluxoPersistido?.generalData || null)
  )
  const [groupedDocuments, setGroupedDocuments] = useState(() =>
    normalizarConfiguracaoDocumentos(
      parseJsonParam(groupedDocumentsParam, null) || fluxoPersistido?.groupedDocuments || null
    )
  )
  const plano = gerarPlanoDocumentacoes({
    modoCriacaoDocumentacao,
    systems,
    groupedDocuments,
  })
  const totalDocumentacoes = contarDocumentacoesPlano(plano)

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState(null)

  function buildBackQuery() {
    salvarFluxoQualificacaoLocal(params.id, {
      numeroSistemas,
      modoCriacaoDocumentacao,
      generalData,
      systems,
      groupedDocuments,
    })

    return serializarFluxoQualificacao({
      numeroSistemas,
      modoCriacaoDocumentacao,
      systems,
      groupedDocuments,
    }).toString()
  }

  async function criarDocumentacoes() {
    if (totalDocumentacoes === 0) {
      setErro('Selecione ao menos um módulo e um tipo de documento antes de criar as documentações.')
      return
    }

    setLoading(true)
    setErro('')

    try {
      salvarFluxoQualificacaoLocal(params.id, {
        numeroSistemas,
        modoCriacaoDocumentacao,
        generalData,
        systems,
        groupedDocuments,
      })

      const data = await salvarPlanoDocumentacoesQualificacao({
        servicoId: Number(params.id),
        generalData,
        modoCriacaoDocumentacao,
        systems,
        groupedDocuments,
      })

      setResultado(data)
    } catch (error) {
      console.log(error)
      setErro(error.message || 'Nao foi possivel salvar as documentações.')
    } finally {
      setLoading(false)
    }
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
            <span className="badge">{numeroSistemas} sistemas</span>
            <span className="badge">{formatarModoCriacaoDocumentacao(modoCriacaoDocumentacao)}</span>
            <span className="badge">{totalDocumentacoes} documentos</span>
            {generalData.empresa?.nome ? <span className="badge">{generalData.empresa.nome}</span> : null}
          </>
        }
      />

      <SurfaceCard className="surface-card--hero">
        <div className="stack-lg">
          <div className="surface-card__header">
            <div>
              <h2 className="surface-card__title">Plano de documentações</h2>
              <p className="surface-card__subtitle">
                O sistema combinará o modo de criação com os módulos IQ, OQ e PQ e com a escolha entre Protocolo, Relatório ou ambos.
              </p>
            </div>
          </div>

          {plano.length === 0 || totalDocumentacoes === 0 ? (
            <EmptyState
              title="Nenhuma documentação configurada"
              description="Volte para os dados gerais e marque pelo menos um tipo de qualificação com Protocolo e/ou Relatório."
            />
          ) : (
            <div className="documentation-plan">
              {plano.map((grupo) => (
                <SurfaceCard key={grupo.id}>
                  <div className="surface-card__header">
                    <div>
                      <h3 className="surface-card__title">{grupo.titulo}</h3>
                      <p className="surface-card__subtitle">{grupo.descricao}</p>
                    </div>

                    <div className="cluster">
                      {grupo.systems.map((system) => (
                        <span key={system.systemNumber} className="badge">
                          {system.nome}
                        </span>
                      ))}
                    </div>
                  </div>

                  {grupo.documentos.length === 0 ? (
                    <p className="muted">Nenhum documento selecionado para este grupo.</p>
                  ) : (
                    <div className="documentation-plan__list">
                      {grupo.documentos.map((documento) => (
                        <div key={`${grupo.id}-${documento.tipoArquivo}-${documento.tipo}`} className="plan-item">
                          <div>
                            <strong>
                              {formatarTipoArquivo(documento.tipoArquivo)} {formatarTipoQualificacao(documento.tipo)}
                            </strong>
                            <p className="muted">{documento.titulo}</p>
                          </div>
                          <span className="badge">{documento.codigo || 'Sem código informado'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </SurfaceCard>
              ))}
            </div>
          )}

          {erro ? <p className="feedback-text feedback-text--error">{erro}</p> : null}

          <div className="form-actions">
            <button className="btn btn--primary" onClick={criarDocumentacoes} disabled={loading}>
              {loading ? 'Salvando...' : 'Criar documentações'}
            </button>
            <button
              className="btn btn--ghost"
              onClick={() =>
                router.push(
                  `/dashboard/servico/${params.id}/documentacao/qualificacao/dados-gerais?${buildBackQuery()}`
                )
              }
            >
              Voltar para edição
            </button>
          </div>
        </div>
      </SurfaceCard>

      {resultado ? (
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
              {resultado.documentacoes.map((documentacao) => (
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
