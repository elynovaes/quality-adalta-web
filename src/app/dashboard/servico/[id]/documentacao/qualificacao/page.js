'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { PageHeader, PageShell, SurfaceCard } from '../../../../../../components/ui'

export default function QualificacaoPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const numeroSistemas = searchParams.get('numeroSistemas')

  function buildForwardQuery() {
    const paramsToForward = new URLSearchParams(searchParams.toString())
    return paramsToForward.toString()
  }

  function navegarParaRelatorioOQ() {
    const rotaBase = `/dashboard/servico/${params.id}/documentacao/qualificacao/relatorio-oq`
    const queryString = buildForwardQuery()

    if (!queryString) {
      router.push(rotaBase)
      return
    }

    router.push(`${rotaBase}?${queryString}`)
  }

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Qualificação"
        title="Escolha o tipo"
        description="Selecione o documento que deseja iniciar ou visualizar dentro da trilha de qualificação."
        meta={
          <>
            <span className="badge badge--primary">Serviço #{params.id}</span>
            {numeroSistemas ? <span className="badge">{numeroSistemas} sistemas</span> : null}
          </>
        }
      />

      <SurfaceCard className="surface-card--hero">
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">Tipos de documento</h2>
            <p className="surface-card__subtitle">
              Esta etapa continua o fluxo após o preenchimento dos dados gerais da qualificação.
            </p>
          </div>
        </div>

        <div className="option-grid">
          <button className="option-card">
            <span className="option-card__title">Protocolo de OQ</span>
            <span className="option-card__description">
              Área destinada ao protocolo operacional de qualificação.
            </span>
          </button>

          <button className="option-card" onClick={navegarParaRelatorioOQ}>
            <span className="option-card__title">Relatório de OQ</span>
            <span className="option-card__description">
              Acesse o formulário atual de relatório de OQ.
            </span>
          </button>

          <button className="option-card">
            <span className="option-card__title">Protocolo de IQ</span>
            <span className="option-card__description">
              Espaço reservado para protocolo de IQ.
            </span>
          </button>

          <button className="option-card">
            <span className="option-card__title">Relatório de IQ</span>
            <span className="option-card__description">
              Espaço reservado para relatório de IQ.
            </span>
          </button>
        </div>
      </SurfaceCard>
    </PageShell>
  )
}
