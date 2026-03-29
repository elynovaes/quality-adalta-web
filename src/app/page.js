'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {

  const [services, setServices] = useState([])

  async function carregarDados() {
    const { data, error } = await supabase
      .from('servicos')
      .select('*')

    if (error) {
      console.log('Erro:', error)
    } else {
      setServices(data)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  return (
    <div style={{ padding: 40 }}>
      <h1>Serviços cadastrados</h1>

      {services.map((item) => (
        <div key={item.id}>
          OS: {item.os} | Cliente: {item.client}
        </div>
      ))}
    </div>
  )
}