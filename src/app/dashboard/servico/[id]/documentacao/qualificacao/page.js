'use client'

import { useParams } from 'next/navigation'
import { PageHeader, PageShell, SurfaceCard } from '../../../../../../components/ui'

export default function QualificacaoPage() {
  const params = useParams()

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Qualificação"
        title="Escolha o tipo"
        description="Selecione o documento que deseja iniciar ou visualizar dentro da trilha de qualificação."
        meta={<span className="badge badge--primary">Serviço #{params.id}</span>}
      />

      <SurfaceCard className="surface-card--hero">
        <div className="option-grid">
          <button className="option-card">
            <span className="option-card__title">Protocolo de OQ</span>
            <span className="option-card__description">
              Área destinada ao protocolo operacional de qualificação.
            </span>
          </button>

          <button
            className="option-card"
            onClick={() => window.location.href = `/dashboard/servico/${params.id}/documentacao/qualificacao/relatorio-oq`}
          >
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
