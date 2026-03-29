'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function RelatorioOQPage() {

  const params = useParams()

  const [codigo, setCodigo] = useState('')
  const [elaborador, setElaborador] = useState('')
  const [data, setData] = useState('')

  return (
    <div style={{ padding: 40 }}>

      <h1>Relatório de OQ</h1>

      <p>ID do serviço: {params.id}</p>

      <h2>Dados gerais</h2>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Código do relatório"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Elaborador"
          value={elaborador}
          onChange={(e) => setElaborador(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>

      <button>Salvar relatório</button>

    </div>
  )
}