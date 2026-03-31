'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import NotificationToast from './NotificationToast'
import { Field, PageHeader, PageShell, SurfaceCard } from './ui'

export default function ServiceForm({
  mode = 'create',
  serviceId = null,
  initialValues = {
    os: '',
    client: '',
    sector: '',
    system: '',
    deliveryDate: '',
  },
}) {
  const [os, setOs] = useState(initialValues.os)
  const [client, setClient] = useState(initialValues.client)
  const [sector, setSector] = useState(initialValues.sector)
  const [system, setSystem] = useState(initialValues.system)
  const [deliveryDate, setDeliveryDate] = useState(initialValues.deliveryDate)
  const [toast, setToast] = useState({ visible: false, message: '', tone: 'success' })

  const router = useRouter()
  const isEditMode = mode === 'edit'

  async function salvarServico() {
    if (isEditMode) {
      const { data, error } = await supabase
        .from('servicos')
        .update({
          os: os,
          client: client,
          sector: sector,
          system: system,
          delivery_date: deliveryDate,
        })
        .eq('id', serviceId)
        .select('id')

      if (error || !data || data.length === 0) {
        console.log(error || 'Nenhum registro foi atualizado.')
        setToast({
          visible: true,
          message: 'Nao foi possivel atualizar este servico.',
          tone: 'error',
        })
      } else {
        window.sessionStorage.setItem(
          'dashboard-toast',
          JSON.stringify({
            message: 'Servico atualizado com sucesso.',
            tone: 'success',
          })
        )
        router.push('/dashboard')
      }

      return
    }

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

  function handleOsChange(event) {
    const rawValue = event.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '')

    if (/^\d{0,4}[A-Z]?$/.test(rawValue)) {
      setOs(rawValue)
    }
  }

  function handleClientChange(event) {
    setClient(event.target.value.toUpperCase())
  }

  function handleSystemChange(event) {
    setSystem(event.target.value.toUpperCase())
  }

  return (
    <PageShell narrow>
      <NotificationToast
        visible={toast.visible}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast({ visible: false, message: '', tone: 'success' })}
      />

      <PageHeader
        eyebrow={isEditMode ? 'Edição' : 'Cadastro'}
        title={isEditMode ? 'Editar serviço' : 'Novo serviço'}
        description={
          isEditMode
            ? 'Atualize os dados principais do serviço sem alterar o fluxo atual da aplicação.'
            : 'Preencha os dados principais para registrar um novo serviço no sistema.'
        }
        actions={
          <button className="btn btn--secondary" onClick={() => router.push('/dashboard')}>
            Voltar ao dashboard
          </button>
        }
      />

      <SurfaceCard className="surface-card--hero">
        <div className="stack-lg">
          <div className="form-grid">
            <Field label="OS" hint="4 numeros (ex: 1234)">
              <input
                id="os"
                className="input"
                placeholder="Ex: 1234 ou 1234A"
                value={os}
                onChange={handleOsChange}
              />
            </Field>

            <Field label="Cliente">
              <input
                id="client"
                className="input"
                placeholder="Nome do cliente"
                value={client}
                onChange={handleClientChange}
              />
            </Field>

            <Field label="Setor">
              <select
                id="sector"
                className="input"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              >
                <option value="">Selecione um setor</option>
                <option value="Comissionamento">Comissionamento</option>
                <option value="TAB">TAB</option>
                <option value="Qualificação">Qualificação</option>
                <option value="Avaliação">Avaliação</option>
              </select>
            </Field>

            <Field label="Sistema">
              <input
                id="system"
                className="input"
                placeholder="Sistema ou equipamento"
                value={system}
                onChange={handleSystemChange}
              />
            </Field>

            <Field label="Data de entrega">
              <input
                id="deliveryDate"
                className="input"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </Field>
          </div>

          <div className="form-actions">
            <button className="btn btn--primary" onClick={salvarServico}>
              {isEditMode ? 'Atualizar' : 'Salvar'}
            </button>
            <button className="btn btn--ghost" onClick={() => router.push('/dashboard')}>
              Cancelar
            </button>
          </div>
        </div>
      </SurfaceCard>
    </PageShell>
  )
}
