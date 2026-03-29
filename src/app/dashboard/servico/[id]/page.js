'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ServicoDetalhe() {
  const params = useParams()
  const [servico, setServico] = useState(null)
  
  const router = useRouter()

  useEffect(() => {
    carregarServico()
  }, [])

  async function carregarServico() {
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
  }

  if (!servico) {
    return <div style={{ padding: 40 }}>Carregando...</div>
  }

  return (
    <div style={{ padding: 40 }}>
      <button onClick={() => router.push('/dashboard')}>
        Voltar
      </button>

      <h1>Detalhes do Serviço</h1>

      <p>ID: {servico.id}</p>
      <p>OS: {servico.os}</p>
      <p>Cliente: {servico.client}</p>
      <p>Setor: {servico.sector}</p>
      <p>Sistema: {servico.system}</p>
      <p>Data de entrega: {servico.delivery_date}</p>

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>

        <button onClick={() => router.push(`/dashboard/servico/${servico.id}/documentacao`)}>
          Criar documentação
        </button>
        
        <button>Ver formulários</button>
        
        <button>Gerar PDF</button>

      </div>
    </div>
  )
}