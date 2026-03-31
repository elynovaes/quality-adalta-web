'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ServiceForm from '../../../../../components/ServiceForm'
import { supabase } from '../../../../../lib/supabase'
import { PageShell, SurfaceCard } from '../../../../../components/ui'

export default function EditarServicoPage() {
  const params = useParams()
  const router = useRouter()
  const [servico, setServico] = useState(null)

  const carregarServico = useEffectEvent(async () => {
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.log(error)
      return
    }

    setServico(data)
  })

  useEffect(() => {
    carregarServico()
  }, [])

  if (!servico) {
    return (
      <PageShell narrow>
        <SurfaceCard>
          <div className="stack">
            <span className="muted">Carregando serviço...</span>
            <button className="btn btn--secondary" onClick={() => router.push('/dashboard')}>
              Voltar ao dashboard
            </button>
          </div>
        </SurfaceCard>
      </PageShell>
    )
  }

  return (
    <ServiceForm
      mode="edit"
      serviceId={servico.id}
      initialValues={{
        os: servico.os || '',
        client: servico.client || '',
        sector: servico.sector || '',
        system: servico.system || '',
        deliveryDate: servico.delivery_date || '',
      }}
    />
  )
}
