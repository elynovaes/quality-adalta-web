'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageShell, SurfaceCard } from '@/components/ui'
import {
  fetchDocumentacaoDetails,
  syncDocumentacaoSupportFields,
} from '@/features/documentacao/services/documentacaoReadService'
import { isVirtualAirflowFieldId } from '@/features/documentacao/utils/airflowSupportFields'
import DocumentacaoView from './DocumentacaoView'

export default function DocumentacaoPage() {
  const params = useParams()
  const documentacaoId = Number(params.id)
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function hasVirtualSupportFields(loaded) {
    return (loaded?.anexos || []).some((anexo) =>
      (anexo.secoes || []).some((secao) =>
        (secao.campos || []).some((campo) => isVirtualAirflowFieldId(campo.id))
      )
    )
  }

  useEffect(() => {
    let cancelled = false

    async function loadDocumentacao() {
      if (Number.isNaN(documentacaoId)) {
        setError('ID da documentação inválido.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        let loaded = await fetchDocumentacaoDetails(documentacaoId)

        if (hasVirtualSupportFields(loaded)) {
          await syncDocumentacaoSupportFields(documentacaoId)
          loaded = await fetchDocumentacaoDetails(documentacaoId)
        }

        if (!cancelled) {
          setDados(loaded)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Nao foi possivel carregar a documentação.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDocumentacao()

    return () => {
      cancelled = true
    }
  }, [documentacaoId])

  if (loading) {
    return (
      <PageShell>
        <SurfaceCard>
          <span className="muted">Carregando documentação...</span>
        </SurfaceCard>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <SurfaceCard>
          <p className="feedback-text feedback-text--error">{error}</p>
        </SurfaceCard>
      </PageShell>
    )
  }

  if (!dados) {
    return (
      <PageShell>
        <SurfaceCard>
          <span className="muted">Nenhum dado de documentação encontrado.</span>
        </SurfaceCard>
      </PageShell>
    )
  }

  return (
    <DocumentacaoView
      dados={dados}
      onRefresh={async () => {
        const loaded = await fetchDocumentacaoDetails(documentacaoId)
        setDados(loaded)
      }}
    />
  )
}
