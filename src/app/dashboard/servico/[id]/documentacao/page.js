'use client'

import { useParams } from 'next/navigation'

export default function DocumentacaoPage() {
  const params = useParams()

  return (
    <div style={{ padding: 40 }}>
      <h1>Documentação do Serviço</h1>
      <p>ID do serviço: {params.id}</p>

      <h2>Escolha a categoria</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        
        <button>Comissionamento</button>
        
        <button onClick={() => window.location.href = `/dashboard/servico/${params.id}/documentacao/qualificacao`}>
          Qualificação
        </button>
        
        <button>TAB</button>
        
        <button>Avaliação</button>
      
      </div>
    </div>
  )
}