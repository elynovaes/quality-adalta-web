'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Field, PageHeader, PageShell, SurfaceCard } from '../../../../../components/ui'

export default function DocumentacaoPage() {
  const params = useParams()
  const router = useRouter()
  const [mostrarEtapaQualificacao, setMostrarEtapaQualificacao] = useState(false)
  const [numeroSistemas, setNumeroSistemas] = useState('1')
  const [erroNumeroSistemas, setErroNumeroSistemas] = useState('')

  function abrirEtapaQualificacao() {
    setMostrarEtapaQualificacao(true)
    setErroNumeroSistemas('')
  }

  function confirmarQualificacao() {
    const quantidade = Number(numeroSistemas)

    if (!numeroSistemas || Number.isNaN(quantidade) || quantidade < 1) {
      setErroNumeroSistemas('Informe uma quantidade valida de sistemas, com minimo 1.')
      return
    }

    router.push(
      `/dashboard/servico/${params.id}/documentacao/qualificacao/dados-gerais?numeroSistemas=${quantidade}`
    )
  }

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Documentação"
        title="Documentação do serviço"
        description="Selecione a categoria de documentação que deseja abrir para o serviço atual."
        meta={<span className="badge badge--primary">Serviço #{params.id}</span>}
      />

      <SurfaceCard className="surface-card--hero">
        <div className="surface-card__header">
          <div>
            <h2 className="surface-card__title">Escolha a categoria</h2>
            <p className="surface-card__subtitle">
              As opções abaixo preservam o fluxo atual e servem como pontos de entrada para cada tipo de documentação.
            </p>
          </div>
        </div>

        <div className="option-grid">
          <button className="option-card">
            <span className="option-card__title">Comissionamento</span>
            <span className="option-card__description">
              Fluxo reservado para registros de comissionamento.
            </span>
          </button>

          <button className="option-card" onClick={abrirEtapaQualificacao}>
            <span className="option-card__title">Qualificação</span>
            <span className="option-card__description">
              Antes de seguir, informe quantos sistemas serão qualificados.
            </span>
          </button>

          <button className="option-card">
            <span className="option-card__title">TAB</span>
            <span className="option-card__description">
              Espaço reservado para a trilha TAB.
            </span>
          </button>

          <button className="option-card">
            <span className="option-card__title">Avaliação</span>
            <span className="option-card__description">
              Área destinada à avaliação final do serviço.
            </span>
          </button>
        </div>
      </SurfaceCard>

      {mostrarEtapaQualificacao ? (
        <SurfaceCard>
          <div className="surface-card__header">
            <div>
              <h2 className="surface-card__title">Quantidade de sistemas</h2>
              <p className="surface-card__subtitle">
                Defina quantos sistemas participarão do fluxo de qualificação antes de continuar.
              </p>
            </div>
          </div>

          <div className="stack">
            <Field label="Numero de sistemas" hint="Informe um valor inteiro maior ou igual a 1">
              <input
                id="numeroSistemas"
                className="input"
                type="number"
                min="1"
                step="1"
                value={numeroSistemas}
                onChange={(event) => {
                  setNumeroSistemas(event.target.value)
                  setErroNumeroSistemas('')
                }}
              />
            </Field>

            {erroNumeroSistemas ? <p className="muted">{erroNumeroSistemas}</p> : null}

            <div className="form-actions">
              <button className="btn btn--primary" onClick={confirmarQualificacao}>
                Continuar
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setMostrarEtapaQualificacao(false)
                  setErroNumeroSistemas('')
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </SurfaceCard>
      ) : null}
    </PageShell>
  )
}
