'use client'

import { useParams } from 'next/navigation'
import { PageHeader, PageShell, SurfaceCard } from '../../../../../components/ui'

export default function DocumentacaoPage() {
  const params = useParams()

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Documentação"
        title="Documentação do serviço"
        description="Selecione a categoria de documentação que deseja abrir para o serviço atual."
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

          <button
            className="option-card"
            onClick={() => window.location.href = `/dashboard/servico/${params.id}/documentacao/qualificacao`}
          >
            <span className="option-card__title">Qualificação</span>
            <span className="option-card__description">
              Acesse protocolos e relatórios de qualificação do serviço.
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
    </PageShell>
  )
}
