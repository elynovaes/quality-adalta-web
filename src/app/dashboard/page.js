'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {

  const router = useRouter()
  const [servicos, setServicos] = useState([])

  useEffect(() => {

    async function verificarUsuario() {

      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/login')
      }

    }

    verificarUsuario()
    carregarServicos()

  }, [])

  async function carregarServicos() {

    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .order('id', { ascending: false })

    console.log('dados:', data)
    console.log('erro:', error)

    if (!error) {
      setServicos(data)
    }

  }

  return (
    <div style={{ padding: 40 }}>

      <h1>Painel do Sistema</h1>

      <button onClick={() => router.push('/dashboard/novo-servico')}>
        Novo Serviço
      </button>

      <h2>Serviços cadastrados</h2>

      {servicos.map((item) => (
        <div
          key={item.id}
          onClick={() => router.push(`/dashboard/servico/${item.id}`)}
          style={{
            marginBottom: 10,
            padding: 10,
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          OS: {item.os} | Cliente: {item.client}
        </div>
      ))}

    </div>
  )
}