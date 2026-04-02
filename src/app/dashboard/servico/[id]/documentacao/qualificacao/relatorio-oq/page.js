'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Field, PageHeader, PageShell, SurfaceCard } from '@/components/ui'
import { useDocumentacaoFlowViewModel } from '@/stores/documentacao-flow-store'

export default function RelatorioOQPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const numeroSistemas = searchParams.get('numeroSistemas')
  const codigoDocumento = searchParams.get('codigoDocumento')
  const flow = useDocumentacaoFlowViewModel()

  const [codigo, setCodigo] = useState('')
  const [elaborador, setElaborador] = useState('')
  const [data, setData] = useState('')

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Relatório"
        title="Relatório de OQ"
        description="Preencha os dados gerais do relatório sem alterar o fluxo atual da aplicação."
        meta={
          <>
            <span className="badge badge--primary">Serviço #{params.id}</span>
            {numeroSistemas || flow.quantidadeSistemas ? (
              <span className="badge">{numeroSistemas || flow.quantidadeSistemas} sistemas</span>
            ) : null}
            {codigoDocumento ? <span className="badge">{codigoDocumento}</span> : null}
            {flow.dadosGerais.empresa?.nome ? <span className="badge">{flow.dadosGerais.empresa.nome}</span> : null}
            {flow.dadosGerais.elaborador?.nome ? <span className="badge">{flow.dadosGerais.elaborador.nome}</span> : null}
          </>
        }
      />

      <SurfaceCard className="surface-card--hero">
        <div className="stack-lg">
          <div className="surface-card__header">
            <div>
              <h2 className="surface-card__title">Dados gerais</h2>
              <p className="surface-card__subtitle">
                Campos básicos para composição do relatório.
              </p>
            </div>
          </div>

          <div className="form-grid form-grid--single">
            <Field label="Código do relatório">
              <input
                id="codigo"
                className="input"
                placeholder="Informe o código"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </Field>

            <Field label="Elaborador">
              <input
                id="elaborador"
                className="input"
                placeholder="Nome do elaborador"
                value={elaborador}
                onChange={(e) => setElaborador(e.target.value)}
              />
            </Field>

            <Field label="Data">
              <input
                id="data"
                className="input"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </Field>
          </div>

          <div className="form-actions">
            <button className="btn btn--primary">Salvar relatório</button>
          </div>
        </div>
      </SurfaceCard>
    </PageShell>
  )
}
