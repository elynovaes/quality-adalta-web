'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createDocumentacaoSection,
  saveDocumentacaoResponses,
} from '@/features/documentacao/services/documentacaoReadService'
import { EmptyState, Field, PageHeader, PageShell, SurfaceCard } from '@/components/ui'

function normalizeCampoTipo(tipo) {
  return String(tipo || '').trim().toLowerCase()
}

function getCampoKind(tipo) {
  const normalizedType = normalizeCampoTipo(tipo)

  if (
    normalizedType.includes('textarea') ||
    normalizedType.includes('longo') ||
    normalizedType.includes('multilinha')
  ) {
    return 'textarea'
  }

  if (normalizedType.includes('select') || normalizedType.includes('lista')) {
    return 'select'
  }

  if (
    normalizedType.includes('checkbox') ||
    normalizedType.includes('boolean') ||
    normalizedType.includes('bool')
  ) {
    return 'checkbox'
  }

  if (normalizedType.includes('date') || normalizedType.includes('data')) {
    return 'date'
  }

  if (normalizedType.includes('number') || normalizedType.includes('numero')) {
    return 'number'
  }

  return 'text'
}

function getCampoLabel(campo) {
  return campo.label || campo.nome || `Campo ${campo.id}`
}

function parseCampoOptions(campo) {
  const rawOptions = campo.opcoes || campo.options || ''

  if (Array.isArray(rawOptions)) {
    return rawOptions.filter(Boolean)
  }

  if (typeof rawOptions !== 'string' || rawOptions.trim() === '') {
    return []
  }

  return rawOptions
    .split(/\r?\n|;|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeResponses(dados) {
  const nextState = {}

  for (const anexo of dados.anexos || []) {
    for (const secao of anexo.secoes || []) {
      for (const campo of secao.campos || []) {
        const kind = getCampoKind(campo.tipo)

        nextState[campo.id] =
          kind === 'checkbox'
            ? campo.resposta === true || campo.resposta === 'true'
            : campo.resposta ?? ''
      }
    }
  }

  return nextState
}

function serializeResposta(campo, value) {
  const kind = getCampoKind(campo.tipo)

  if (kind === 'checkbox') {
    return Boolean(value)
  }

  if (kind === 'number') {
    return value === '' ? '' : Number(value)
  }

  return value ?? ''
}

export default function DocumentacaoView({ dados, onRefresh }) {
  const router = useRouter()
  const [loadingAnexoId, setLoadingAnexoId] = useState(null)
  const [savingSectionId, setSavingSectionId] = useState(null)
  const [feedback, setFeedback] = useState({ error: '', success: '' })
  const [responses, setResponses] = useState(() => normalizeResponses(dados))

  useEffect(() => {
    setResponses(normalizeResponses(dados))
  }, [dados])

  const totalCampos = useMemo(
    () =>
      (dados.anexos || []).reduce(
        (sum, anexo) =>
          sum +
          (anexo.secoes || []).reduce(
            (sectionSum, secao) => sectionSum + (secao.campos?.length || 0),
            0
          ),
        0
      ),
    [dados]
  )

  async function reloadDocumentacao() {
    setFeedback({ error: '', success: '' })
    await onRefresh()
  }

  async function criarSecao(anexo) {
    const nome = window.prompt('Nome da nova seção')

    if (!nome || !nome.trim()) {
      return
    }

    try {
      setLoadingAnexoId(anexo.id)
      setFeedback({ error: '', success: '' })

      await createDocumentacaoSection({
        anexoId: anexo.id,
        nome: nome.trim(),
        ordem: (anexo.secoes?.length || 0) + 1,
      })

      await reloadDocumentacao()
      setFeedback({ error: '', success: 'Seção criada com sucesso.' })
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel criar a seção.',
        success: '',
      })
    } finally {
      setLoadingAnexoId(null)
    }
  }

  async function salvarSecao(secao) {
    try {
      setSavingSectionId(secao.id)
      setFeedback({ error: '', success: '' })

      await saveDocumentacaoResponses({
        documentacaoId: dados.documentacao.id,
        respostas: (secao.campos || []).map((campo) => ({
          campoId: campo.id,
          value: serializeResposta(campo, responses[campo.id]),
        })),
      })

      await reloadDocumentacao()
      setFeedback({ error: '', success: 'Respostas salvas com sucesso.' })
    } catch (error) {
      setFeedback({
        error: error.message || 'Nao foi possivel salvar as respostas.',
        success: '',
      })
    } finally {
      setSavingSectionId(null)
    }
  }

  function renderFieldInput(campo) {
    const kind = getCampoKind(campo.tipo)
    const options = parseCampoOptions(campo)
    const fieldId = `campo-${campo.id}`
    const value = responses[campo.id]

    if (kind === 'textarea') {
      return (
        <textarea
          id={fieldId}
          className="textarea"
          value={String(value ?? '')}
          onChange={(event) =>
            setResponses((current) => ({
              ...current,
              [campo.id]: event.target.value,
            }))
          }
        />
      )
    }

    if (kind === 'select') {
      return (
        <select
          id={fieldId}
          className="input"
          value={String(value ?? '')}
          onChange={(event) =>
            setResponses((current) => ({
              ...current,
              [campo.id]: event.target.value,
            }))
          }
        >
          <option value="">Selecione</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }

    if (kind === 'checkbox') {
      return (
        <label className="checkbox-field" htmlFor={fieldId}>
          <input
            id={fieldId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) =>
              setResponses((current) => ({
                ...current,
                [campo.id]: event.target.checked,
              }))
            }
          />
          <span>Marcar resposta</span>
        </label>
      )
    }

    return (
      <input
        id={fieldId}
        className="input"
        type={kind}
        value={String(value ?? '')}
        onChange={(event) =>
          setResponses((current) => ({
            ...current,
            [campo.id]: event.target.value,
          }))
        }
      />
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Documentação"
        title={dados.documentacao.titulo}
        description="Estrutura da documentação com anexos, seções, campos e respostas persistidas para consulta e manutenção."
        actions={
          <div className="cluster">
            <button
              className="btn btn--secondary"
              onClick={() =>
                dados.documentacao.servico_id
                  ? router.push(`/dashboard/servico/${dados.documentacao.servico_id}`)
                  : router.push('/dashboard')
              }
            >
              Voltar
            </button>
            <button className="btn btn--ghost" onClick={() => router.push('/dashboard')}>
              Dashboard
            </button>
          </div>
        }
        meta={
          <>
            <span className="badge badge--primary">{dados.documentacao.categoria}</span>
            <span className="badge">{dados.documentacao.tipo}</span>
            <span className="badge">
              {dados.documentacao.modo_criacao_documentacao || 'por_sistema'}
            </span>
            <span className="badge">
              {dados.sistemas?.length
                ? dados.sistemas.map((sistema) => sistema.nome).join(', ')
                : dados.documentacao.sistema_id
                  ? `Sistema #${dados.documentacao.sistema_id}`
                  : 'Todos os sistemas'}
            </span>
            <span className="badge">{dados.anexos.length} anexos</span>
            <span className="badge">{totalCampos} campos</span>
          </>
        }
      />

      {feedback.error ? <p className="feedback-text feedback-text--error">{feedback.error}</p> : null}
      {feedback.success ? <p className="feedback-text">{feedback.success}</p> : null}

      {dados.anexos.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            title="Nenhum anexo encontrado"
            description="Esta documentação ainda não possui anexos vinculados."
          />
        </SurfaceCard>
      ) : (
        <div className="anexo-list">
          {dados.anexos.map((anexo) => (
            <SurfaceCard key={anexo.id}>
              <div className="surface-card__header">
                <div>
                  <h2 className="surface-card__title">{anexo.nome}</h2>
                  <p className="surface-card__subtitle">
                    {anexo.descricao || 'Sem descrição cadastrada para este anexo.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => criarSecao(anexo)}
                  disabled={loadingAnexoId === anexo.id}
                >
                  {loadingAnexoId === anexo.id ? 'Criando...' : 'Nova seção'}
                </button>
              </div>

              {anexo.secoes.length === 0 ? (
                <EmptyState
                  title="Nenhuma seção encontrada"
                  description="Use a ação acima para adicionar a primeira seção deste anexo."
                />
              ) : (
                <div className="section-list">
                  {anexo.secoes.map((secao) => (
                    <div key={secao.id} className="section-panel stack">
                      <div className="section-panel__header">
                        <div className="cluster">
                          <span className="badge badge--primary">{secao.nome}</span>
                          <span className="badge">
                            {secao.campos.length} {secao.campos.length === 1 ? 'campo' : 'campos'}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => salvarSecao(secao)}
                          disabled={savingSectionId === secao.id}
                        >
                          {savingSectionId === secao.id ? 'Salvando...' : 'Salvar respostas'}
                        </button>
                      </div>

                      {secao.campos.length === 0 ? (
                        <p className="muted">Nenhum campo nesta seção.</p>
                      ) : (
                        <div className="form-grid form-grid--single">
                          {secao.campos.map((campo) => (
                            <Field
                              key={campo.id}
                              label={getCampoLabel(campo)}
                              hint={campo.tipo ? `Tipo: ${campo.tipo}` : undefined}
                            >
                              {renderFieldInput(campo)}
                            </Field>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SurfaceCard>
          ))}
        </div>
      )}
    </PageShell>
  )
}
