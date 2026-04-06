'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { EmptyState, Field, PageHeader, PageShell, SurfaceCard } from '../../components/ui'
import NotificationToast from '../../components/NotificationToast'
import { ConfirmDialog } from '../../components/AppDialog'

export default function Dashboard() {
  const router = useRouter()
  const [servicos, setServicos] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [sectorFilter, setSectorFilter] = useState('todos')
  const [systemFilter, setSystemFilter] = useState('todos')
  const [sortMode, setSortMode] = useState('recentes')
  const [deletingId, setDeletingId] = useState(null)
  const [toast, setToast] = useState({ visible: false, message: '', tone: 'success' })
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

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
    setConfirmDeleteId(id)
  }

  async function confirmarExclusaoServico() {
    const id = confirmDeleteId

    if (!id) {
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
      setConfirmDeleteId(null)
      return
    }

    setToast({
      visible: true,
      message: 'Servico excluido com sucesso.',
      tone: 'success',
    })
    setDeletingId(null)
    setConfirmDeleteId(null)
    const { data, error: reloadError } = await buscarServicos()

    if (!reloadError) {
      setServicos(data)
    }
  }

  function editarServico(event, id) {
    event.stopPropagation()
    router.push(`/dashboard/servico/${id}/editar`)
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  const sectorOptions = Array.from(
    new Set(servicos.map((item) => item.sector).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, 'pt-BR'))

  const systemOptions = Array.from(
    new Set(servicos.map((item) => item.system).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, 'pt-BR'))

  const filteredServicos = servicos
    .filter((item) => {
      if (sectorFilter !== 'todos' && item.sector !== sectorFilter) {
        return false
      }

      if (systemFilter !== 'todos' && item.system !== systemFilter) {
        return false
      }

      if (!normalizedSearchTerm) {
        return true
      }

      const searchableValues = [
        item.os,
        item.client,
        item.sector,
        item.system,
        item.delivery_date,
      ]

      return searchableValues
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearchTerm))
    })
    .sort((left, right) => {
      if (sortMode === 'os-asc') {
        return String(left.os || left.id).localeCompare(String(right.os || right.id), 'pt-BR', {
          numeric: true,
        })
      }

      if (sortMode === 'os-desc') {
        return String(right.os || right.id).localeCompare(String(left.os || left.id), 'pt-BR', {
          numeric: true,
        })
      }

      if (sortMode === 'cliente-asc') {
        return String(left.client || '').localeCompare(String(right.client || ''), 'pt-BR')
      }

      if (sortMode === 'entrega-asc') {
        return String(left.delivery_date || '').localeCompare(String(right.delivery_date || ''), 'pt-BR')
      }

      if (sortMode === 'entrega-desc') {
        return String(right.delivery_date || '').localeCompare(String(left.delivery_date || ''), 'pt-BR')
      }

      return Number(right.id || 0) - Number(left.id || 0)
    })

  return (
    <PageShell>
      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Excluir serviço"
        description="Esse serviço será removido do dashboard."
        confirmLabel="Excluir serviço"
        busy={Boolean(deletingId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmarExclusaoServico}
      />

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
            <button className="btn btn--primary" onClick={() => router.push('/dashboard/novo-servico')}>
              Novo serviço
            </button>
          }
          meta={
            <>
              <span className="badge badge--primary">{servicos.length} registros</span>
            </>
          }
        />
      </SurfaceCard>

      <SurfaceCard>
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">Serviços cadastrados</h2>
            <p className="surface-card__subtitle">
              Clique em uma linha para abrir os detalhes do serviço correspondente.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="dashboard-search-row" style={{ marginBottom: 16 }}>
            <Field label="Pesquisar">
              <input
                className="input"
                placeholder="Buscar por OS, cliente, setor, sistema ou entrega"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </Field>

            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setShowAdvancedSearch((currentValue) => !currentValue)}
            >
              {showAdvancedSearch ? 'Ocultar pesquisa avançada' : 'Pesquisa avançada'}
            </button>
          </div>

          {showAdvancedSearch ? (
            <div className="form-grid">
              <Field label="Setor">
                <select className="input" value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
                  <option value="todos">Todos</option>
                  {sectorOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Sistema">
                <select className="input" value={systemFilter} onChange={(event) => setSystemFilter(event.target.value)}>
                  <option value="todos">Todos</option>
                  {systemOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Ordenar por">
                <select className="input" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                  <option value="recentes">Mais recentes</option>
                  <option value="os-asc">OS crescente</option>
                  <option value="os-desc">OS decrescente</option>
                  <option value="cliente-asc">Cliente A-Z</option>
                  <option value="entrega-asc">Entrega mais antiga</option>
                  <option value="entrega-desc">Entrega mais recente</option>
                </select>
              </Field>
            </div>
          ) : null}
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
        ) : filteredServicos.length === 0 ? (
          <EmptyState
            title="Nenhum resultado encontrado"
            description="Ajuste os filtros ou a pesquisa para encontrar o serviço desejado."
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

            {filteredServicos.map((item) => (
              <div
                key={item.id}
                className="list-table__row list-table__row--interactive"
                onClick={() => router.push(`/dashboard/servico/${item.id}`)}
              >
                <span className="badge badge--os">{item.os || item.id}</span>
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
