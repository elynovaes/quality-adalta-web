'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { EmptyState, PageHeader, PageShell, SurfaceCard } from '../../components/ui'
import LogoutButton from '../../components/LogoutButton'
import NotificationToast from '../../components/NotificationToast'

export default function Dashboard() {
  const router = useRouter()
  const [servicos, setServicos] = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const [toast, setToast] = useState({ visible: false, message: '', tone: 'success' })

  async function buscarServicos() {
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .order('id', { ascending: false })

    console.log('dados:', data)
    console.log('erro:', error)

    return { data, error }
  }

  const carregarServicos = useEffectEvent(async () => {
    const { data, error } = await buscarServicos()

    if (!error) {
      setServicos(data)
    }
  })

  const carregarToastPersistido = useEffectEvent(() => {
    const rawToast = window.sessionStorage.getItem('dashboard-toast')

    if (!rawToast) {
      return
    }

    window.sessionStorage.removeItem('dashboard-toast')

    try {
      const parsedToast = JSON.parse(rawToast)

      if (parsedToast?.message) {
        setToast({
          visible: true,
          message: parsedToast.message,
          tone: parsedToast.tone || 'success',
        })
      }
    } catch (error) {
      console.log(error)
    }
  })

  useEffect(() => {
    async function verificarUsuario() {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/login')
      }
    }

    verificarUsuario()
    carregarServicos()
    carregarToastPersistido()
  }, [router])

  async function excluirServico(event, id) {
    event.stopPropagation()

    const confirmou = window.confirm('Tem certeza que deseja excluir este serviço?')

    if (!confirmou) {
      return
    }

    setDeletingId(id)

    const { data: deletedRows, error } = await supabase
      .from('servicos')
      .delete()
      .eq('id', id)
      .select('id')

    if (error || !deletedRows || deletedRows.length === 0) {
      console.log(error || 'Nenhum registro foi excluido.')
      setToast({
        visible: true,
        message: 'Nao foi possivel excluir este servico.',
        tone: 'error',
      })
      setDeletingId(null)
      return
    }

    setToast({
      visible: true,
      message: 'Servico excluido com sucesso.',
      tone: 'success',
    })
    setDeletingId(null)
    const { data, error: reloadError } = await buscarServicos()

    if (!reloadError) {
      setServicos(data)
    }
  }

  function editarServico(event, id) {
    event.stopPropagation()
    router.push(`/dashboard/servico/${id}/editar`)
  }

  return (
    <PageShell>
      <NotificationToast
        visible={toast.visible}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast({ visible: false, message: '', tone: 'success' })}
      />

      <SurfaceCard className="surface-card--hero">
        <PageHeader
          eyebrow="Dashboard"
          title="Painel do sistema"
          description="Gerencie serviços cadastrados, acesse os detalhes operacionais e avance para os fluxos de documentação com uma estrutura visual mais clara."
          actions={
            <>
              <LogoutButton />
              <button className="btn btn--primary" onClick={() => router.push('/dashboard/novo-servico')}>
                Novo serviço
              </button>
            </>
          }
          meta={
            <>
              <span className="badge badge--primary">{servicos.length} registros</span>
              <span className="badge">Ordem mais recente primeiro</span>
            </>
          }
        />
      </SurfaceCard>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card__label">Serviços cadastrados</span>
          <span className="stat-card__value">{servicos.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Fluxo principal</span>
          <span className="stat-card__value">Dashboard</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Integração</span>
          <span className="stat-card__value">Supabase</span>
        </div>
      </div>

      <SurfaceCard>
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">Serviços cadastrados</h2>
            <p className="surface-card__subtitle">
              Clique em uma linha para abrir os detalhes do serviço correspondente.
            </p>
          </div>
        </div>

        {servicos.length === 0 ? (
          <EmptyState
            title="Nenhum serviço cadastrado"
            description="Use a ação de criação para adicionar o primeiro serviço e iniciar o fluxo operacional."
            action={
              <button className="btn btn--primary" onClick={() => router.push('/dashboard/novo-servico')}>
                Criar primeiro serviço
              </button>
            }
          />
        ) : (
          <div className="list-table">
            <div className="list-table__header">
              <span>OS</span>
              <span>Cliente</span>
              <span>Setor</span>
              <span>Sistema</span>
              <span>Ações</span>
            </div>

            {servicos.map((item) => (
              <div
                key={item.id}
                className="list-table__row list-table__row--interactive"
                onClick={() => router.push(`/dashboard/servico/${item.id}`)}
              >
                <span className="badge">#{item.os || item.id}</span>
                <div className="list-table__cell-title">
                  <span className="list-table__title">{item.client || 'Cliente não informado'}</span>
                  <span className="list-table__description">
                    Entrega: {item.delivery_date || 'não informada'}
                  </span>
                </div>
                <span>{item.sector || '-'}</span>
                <span>{item.system || '-'}</span>
                <div className="cluster">
                  <button className="btn btn--secondary" onClick={(event) => editarServico(event, item.id)}>
                    Editar
                  </button>
                  <button
                    className="btn btn--danger"
                    onClick={(event) => excluirServico(event, item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </PageShell>
  )
}
