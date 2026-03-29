'use client'

import { useParams } from 'next/navigation'

export default function QualificacaoPage() {
  const params = useParams()

  return (
    <div style={{ padding: 40 }}>
      <h1>Qualificação</h1>

      <p>ID do serviço: {params.id}</p>

      <h2>Escolha o tipo</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        
        <button>Protocolo de OQ</button>
        
        <button onClick={() => window.location.href = `/dashboard/servico/${params.id}/documentacao/qualificacao/relatorio-oq`}>
          Relatório de OQ
        
        </button>
        <button>Protocolo de IQ</button>
        
        <button>Relatório de IQ</button>
     
      </div>
    </div>
  )
}