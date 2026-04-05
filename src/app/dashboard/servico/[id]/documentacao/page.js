'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Field, PageHeader, PageShell, SurfaceCard } from '../../../../../components/ui'
import { fetchServicoResumo } from '@/features/documentacao/services/servicoResumoService'
import { formatarModoCriacaoDocumentacao, MODOS_CRIACAO_DOCUMENTACAO } from '@/lib/qualificacao'
import { useDocumentacaoFlowStore } from '@/stores/documentacao-flow-store'

export default function DocumentacaoPage() {
  const params = useParams()
  const router = useRouter()
  const { setServiceSnapshot, startFlow, state } = useDocumentacaoFlowStore()
  const [mostrarEtapaQualificacao, setMostrarEtapaQualificacao] = useState(false)
  const [numeroSistemas, setNumeroSistemas] = useState(String(state.quantidadeSistemas || 1))
  const [modoCriacaoDocumentacao, setModoCriacaoDocumentacao] = useState(
    state.serviceId === Number(params.id)
      ? state.modoCriacaoDocumentacao
      : MODOS_CRIACAO_DOCUMENTACAO[0]
  )
  const [erroNumeroSistemas, setErroNumeroSistemas] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function carregarServico() {
      try {
        const resumo = await fetchServicoResumo(Number(params.id))
        setServiceSnapshot({
          id: resumo.id,
          os: resumo.os,
          cliente: resumo.cliente,
          sistema: resumo.sistema,
        })
      } catch (error) {
        console.log(error)
      }
    }

    carregarServico()
  }, [params.id, setServiceSnapshot])

  function abrirEtapaQualificacao() {
    setMostrarEtapaQualificacao(true)
    setErroNumeroSistemas('')
  }

  async function confirmarQualificacao() {
    const quantidade = Number(numeroSistemas)

    if (!numeroSistemas || Number.isNaN(quantidade) || quantidade < 1) {
      setErroNumeroSistemas('Informe uma quantidade valida de sistemas, com minimo 1.')
      return
    }

    setLoading(true)

    try {
      const resumo = await fetchServicoResumo(Number(params.id))

      startFlow({
        serviceId: resumo.id,
        os: resumo.os,
        cliente: resumo.cliente,
        quantidadeSistemas: quantidade,
        modoCriacaoDocumentacao,
        serviceSnapshot: resumo,
      })

      router.push(`/dashboard/servico/${params.id}/documentacao/qualificacao/dados-gerais`)
    } catch (error) {
      console.log(error)
      setErroNumeroSistemas(error.message || 'Nao foi possivel iniciar o fluxo de qualificação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Documentação"
        title="Documentação do serviço"
        description="Selecione a categoria de documentação que deseja abrir para o serviço atual."
        actions={
          <button
            className="btn btn--secondary"
            onClick={() => router.push(`/dashboard/servico/${params.id}`)}
          >
            Voltar
          </button>
        }
        meta={<span className="badge badge--primary">Serviço #{params.id}</span>}
      />

      <SurfaceCard className="surface-card--hero">
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">Escolha a categoria</h2>
            <p className="surface-card__subtitle">
              As opções abaixo preservam o fluxo atual e servem como pontos de entrada para cada tipo de documentação.
            </p>
          </div>
        </div>

        <div className="option-grid">
          <button className="option-card">
            <span className="option-card__title">Comissionamento</span>
            <span className="option-card__description">
              Fluxo reservado para registros de comissionamento.
            </span>
          </button>

          <button className="option-card" onClick={abrirEtapaQualificacao}>
            <span className="option-card__title">Qualificação</span>
            <span className="option-card__description">
              Antes de seguir, informe quantos sistemas serão qualificados.
            </span>
          </button>

          <button className="option-card">
            <span className="option-card__title">TAB</span>
            <span className="option-card__description">
              Espaço reservado para a trilha TAB.
            </span>
          </button>

          <button className="option-card">
            <span className="option-card__title">Avaliação</span>
            <span className="option-card__description">
              Área destinada à avaliação final do serviço.
            </span>
          </button>
        </div>
      </SurfaceCard>

      {mostrarEtapaQualificacao ? (
        <SurfaceCard>
          <div className="surface-card__header">
            <div>
              <h2 className="surface-card__title">Quantidade de sistemas</h2>
              <p className="surface-card__subtitle">
                Defina quantos sistemas participarão do fluxo de qualificação antes de continuar.
              </p>
            </div>
          </div>

          <div className="stack">
            <Field label="Numero de sistemas" hint="Informe um valor inteiro maior ou igual a 1">
              <input
                id="numeroSistemas"
                className="input"
                type="number"
                min="1"
                step="1"
                value={numeroSistemas}
                onChange={(event) => {
                  setNumeroSistemas(event.target.value)
                  setErroNumeroSistemas('')
                }}
              />
            </Field>

            <div className="stack">
              <div className="surface-card__header">
                <div>
                  <h3 className="surface-card__title">Modo de criação das documentações</h3>
                  <p className="surface-card__subtitle">
                    Escolha se a qualificação será gerada em um conjunto único para todos os sistemas ou em trilhas independentes.
                  </p>
                </div>
              </div>

              <div className="option-grid">
                {MODOS_CRIACAO_DOCUMENTACAO.map((modo) => (
                  <button
                    key={modo}
                    type="button"
                    className={`option-card option-card--selectable ${modoCriacaoDocumentacao === modo ? 'option-card--active' : ''}`}
                    onClick={() => setModoCriacaoDocumentacao(modo)}
                  >
                    <span className="option-card__title">
                      {formatarModoCriacaoDocumentacao(modo)}
                    </span>
                    <span className="option-card__description">
                      {modo === 'agrupado'
                        ? 'Um único conjunto de Protocolo e/ou Relatório será aplicado aos sistemas informados.'
                        : 'Cada sistema terá seu próprio conjunto de documentos de qualificação.'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {erroNumeroSistemas ? <p className="muted">{erroNumeroSistemas}</p> : null}

            <div className="form-actions">
              <button className="btn btn--primary" onClick={confirmarQualificacao} disabled={loading}>
                {loading ? 'Carregando...' : 'Continuar'}
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setMostrarEtapaQualificacao(false)
                  setErroNumeroSistemas('')
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </SurfaceCard>
      ) : null}
    </PageShell>
  )
}
