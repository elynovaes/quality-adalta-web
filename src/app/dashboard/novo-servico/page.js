'use client'

import { useState } from 'react'

import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovoServico() {
  const [os, setOs] = useState('')
  const [client, setClient] = useState('')
  const [sector, setSector] = useState('')
  const [system, setSystem] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')

  const router = useRouter()

  async function salvarServico() {
    const { error } = await supabase.from('servicos').insert([
      {
        os: os,
        client: client,
        sector: sector,
        system: system,
        delivery_date: deliveryDate,
      },
    ])

    if (error) {
      alert('Erro ao salvar')
      console.log(error)
    } else {
      alert('Serviço salvo com sucesso')
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Novo Serviço</h1>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="OS"
          value={os}
          onChange={(e) => setOs(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Cliente"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Setor"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Sistema"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />
      </div>

      <button onClick={salvarServico}>Salvar</button>
    </div>
  )
}