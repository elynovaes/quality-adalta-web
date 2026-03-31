'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { supabase } from '../lib/supabase'
import { EmptyState, PageHeader, PageShell, SurfaceCard } from '../components/ui'

export default function Home() {
  const [services, setServices] = useState([])

  const carregarDados = useEffectEvent(async () => {
    const { data, error } = await supabase
      .from('servicos')
      .select('*')

    if (error) {
      console.log('Erro:', error)
    } else {
      setServices(data)
    }
  })

  useEffect(() => {
    carregarDados()
  }, [])

  return (
    <PageShell>
      <SurfaceCard className="surface-card--hero">
        <PageHeader
          eyebrow="Visão Geral"
          title="Serviços cadastrados"
          description="Painel inicial com os registros já disponíveis no sistema, apresentado em um formato mais legível e pronto para expansão."
          meta={
            <>
              <span className="badge badge--primary">{services.length} serviços</span>
              <span className="badge">Supabase conectado</span>
            </>
          }
        />
      </SurfaceCard>

      <SurfaceCard>
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">Lista atual</h2>
            <p className="surface-card__subtitle">
              Relação simples dos serviços carregados da base.
            </p>
          </div>
        </div>

        {services.length === 0 ? (
          <EmptyState
            title="Nenhum serviço encontrado"
            description="Quando houver registros em `servicos`, eles aparecerão aqui automaticamente."
          />
        ) : (
          <div className="list-table">
            <div className="list-table__header">
              <span>ID</span>
              <span>Cliente</span>
              <span>OS</span>
              <span>Setor</span>
              <span>Sistema</span>
            </div>

            {services.map((item) => (
              <div key={item.id} className="list-table__row">
                <span className="badge">#{item.id}</span>
                <div className="list-table__cell-title">
                  <span className="list-table__title">{item.client || 'Sem cliente'}</span>
                  <span className="list-table__description">
                    Entrega: {item.delivery_date || 'não informada'}
                  </span>
                </div>
                <span>{item.os || '-'}</span>
                <span>{item.sector || '-'}</span>
                <span>{item.system || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </PageShell>
  )
}
