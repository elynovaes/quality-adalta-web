'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, PageShell, SurfaceCard } from '../../../../components/ui'

export default function ServicoDetalhe() {
  const params = useParams()
  const [servico, setServico] = useState(null)

  const router = useRouter()
  const carregarServico = useEffectEvent(async () => {
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.log(error)
    } else {
      setServico(data)
    }
  })

  useEffect(() => {
    carregarServico()
  }, [])

  if (!servico) {
    return (
      <PageShell>
        <SurfaceCard>
          <span className="muted">Carregando...</span>
        </SurfaceCard>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Serviço"
        title={`Detalhes do serviço #${servico.id}`}
        description="Visualize os dados do serviço e siga para as etapas de documentação disponíveis."
        actions={
          <button className="btn btn--secondary" onClick={() => router.push('/dashboard')}>
            Voltar
          </button>
        }
        meta={
          <>
            <span className="badge badge--primary">OS {servico.os || '-'}</span>
            <span className="badge">{servico.client || 'Cliente não informado'}</span>
          </>
        }
      />

      <div className="split-grid">
        <div className="split-grid__main stack-lg">
          <SurfaceCard className="surface-card--hero">
            <div className="surface-card__header">
              <div>
                <h2 className="surface-card__title">Informações gerais</h2>
                <p className="surface-card__subtitle">
                  Resumo dos dados principais cadastrados para este serviço.
                </p>
              </div>
            </div>

            <div className="data-list">
              <div className="data-row">
                <span className="data-row__label">ID</span>
                <span className="data-row__value">{servico.id}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">OS</span>
                <span className="data-row__value">{servico.os}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">Cliente</span>
                <span className="data-row__value">{servico.client}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">Setor</span>
                <span className="data-row__value">{servico.sector}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">Sistema</span>
                <span className="data-row__value">{servico.system}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">Data de entrega</span>
                <span className="data-row__value">{servico.delivery_date}</span>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div className="split-grid__side stack-lg">
          <SurfaceCard>
            <div className="surface-card__header">
              <div>
                <h2 className="surface-card__title">Ações</h2>
                <p className="surface-card__subtitle">
                  Atalhos para os próximos passos relacionados ao serviço.
                </p>
              </div>
            </div>

            <div className="stack">
              <button
                className="btn btn--primary"
                onClick={() => router.push(`/dashboard/servico/${servico.id}/documentacao`)}
              >
                Criar documentação
              </button>

              <button className="btn btn--secondary">Ver formulários</button>

              <button className="btn btn--ghost">Gerar PDF</button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </PageShell>
  )
}
