'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { Field, PageHeader, PageShell, SurfaceCard } from '../../../../components/ui'
import {
  deleteDocumentacaoById,
  updateDocumentacaoCode,
} from '@/features/documentacao/services/documentacaoReadService'
import {
  fetchServiceGeneralData,
  updateServiceGeneralData,
} from '@/features/documentacao/services/serviceGeneralDataService'

export default function ServicoDetalhe() {
  const params = useParams()
  const [servico, setServico] = useState(null)
  const [dadosGerais, setDadosGerais] = useState(null)
  const [documentacoes, setDocumentacoes] = useState([])
  const [editandoDadosGerais, setEditandoDadosGerais] = useState(false)
  const [dadosGeraisForm, setDadosGeraisForm] = useState(null)
  const [salvandoDadosGerais, setSalvandoDadosGerais] = useState(false)
  const [erroDadosGerais, setErroDadosGerais] = useState('')
  const [dadosGeraisExpanded, setDadosGeraisExpanded] = useState(false)
  const [deletingDocumentacaoId, setDeletingDocumentacaoId] = useState(null)
  const [editingCodigoId, setEditingCodigoId] = useState(null)
  const [codigoDraft, setCodigoDraft] = useState('')
  const [savingCodigoId, setSavingCodigoId] = useState(null)
  const [erroDocumentacoes, setErroDocumentacoes] = useState('')
  const currentServiceId = Number(params.id)

  const router = useRouter()
  const carregarServico = useEffectEvent(async () => {
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', currentServiceId)
      .single()

    if (error) {
      console.log(error)
    } else {
      setServico(data)
    }
  })

  const carregarDadosGerais = useEffectEvent(async () => {
    try {
      const loaded = await fetchServiceGeneralData(currentServiceId)
      setDadosGerais(loaded)
      setDadosGeraisForm(loaded)
      setErroDadosGerais('')
    } catch (error) {
      console.log(error)
      setDadosGerais(null)
      setDadosGeraisForm(null)
      setErroDadosGerais(error.message || 'Nao foi possivel carregar os dados gerais.')
    }
  })

  const carregarDocumentacoes = useEffectEvent(async () => {
    const { data, error } = await supabase
      .from('documentacoes')
      .select('id, titulo, tipo, codigo, categoria, modo_criacao_documentacao')
      .eq('servico_id', currentServiceId)
      .order('id', { ascending: false })

    if (error) {
      console.log(error)
      return
    }

    const loadedDocs = data || []
    setDocumentacoes(loadedDocs)
    setErroDocumentacoes('')
  })

  useEffect(() => {
    carregarServico()
    carregarDadosGerais()
    carregarDocumentacoes()
  }, [])

  function updateDadosGeraisForm(section, field, value) {
    setDadosGeraisForm((current) => ({
      ...current,
      [section]: {
        ...(current?.[section] || {}),
        [field]: value,
      },
    }))
  }

  async function salvarDadosGerais() {
    if (!dadosGeraisForm) {
      return
    }

    try {
      setSalvandoDadosGerais(true)
      setErroDadosGerais('')
      const updated = await updateServiceGeneralData(currentServiceId, dadosGeraisForm)
      setDadosGerais(updated)
      setDadosGeraisForm(updated)
      setEditandoDadosGerais(false)
    } catch (error) {
      console.log(error)
      setErroDadosGerais(error.message || 'Nao foi possivel atualizar os dados gerais.')
    } finally {
      setSalvandoDadosGerais(false)
    }
  }

  function iniciarEdicaoDadosGerais() {
    setDadosGeraisForm(
      dadosGerais || {
        documentacaoId: null,
        documentacaoTitulo: '',
        empresa: { nome: '', endereco: '', cep: '' },
        elaborador: { nome: '', cargo: '' },
        revisor: { nome: '', cargo: '' },
        aprovador: { nome: '', cargo: '', telefone: '', email: '' },
        logoCliente: null,
      }
    )
    setDadosGeraisExpanded(true)
    setEditandoDadosGerais(true)
    setErroDadosGerais('')
  }

  async function excluirDocumentacao(documentacaoId) {
    const confirmou = window.confirm('Tem certeza que deseja excluir esta documentação?')

    if (!confirmou) {
      return
    }

    try {
      setDeletingDocumentacaoId(documentacaoId)
      setErroDocumentacoes('')

      await deleteDocumentacaoById(documentacaoId)

      const remainingDocumentacoes = documentacoes.filter((item) => item.id !== documentacaoId)
      setDocumentacoes(remainingDocumentacoes)

      if (dadosGerais?.documentacaoId === documentacaoId) {
        const loaded = await fetchServiceGeneralData(currentServiceId)
        setDadosGerais(loaded)
        setDadosGeraisForm(loaded)
        setEditandoDadosGerais(false)
      }
    } catch (error) {
      console.log(error)
      setErroDocumentacoes(error.message || 'Nao foi possivel excluir a documentação.')
    } finally {
      setDeletingDocumentacaoId(null)
    }
  }

  function iniciarEdicaoCodigo(documentacao) {
    setEditingCodigoId(documentacao.id)
    setCodigoDraft(documentacao.codigo || '')
    setErroDocumentacoes('')
  }

  async function salvarCodigoDocumentacao(documentacaoId) {
    try {
      setSavingCodigoId(documentacaoId)
      setErroDocumentacoes('')
      const updated = await updateDocumentacaoCode(documentacaoId, codigoDraft)

      setDocumentacoes((current) =>
        current.map((item) =>
          item.id === documentacaoId
            ? {
                ...item,
                codigo: updated.codigo,
              }
            : item
        )
      )
      setEditingCodigoId(null)
      setCodigoDraft('')
    } catch (error) {
      console.log(error)
      setErroDocumentacoes(error.message || 'Nao foi possivel atualizar o código da documentação.')
    } finally {
      setSavingCodigoId(null)
    }
  }

  if (!servico) {
    return (
      <PageShell>
        <SurfaceCard>
          <span className="muted">Carregando...</span>
        </SurfaceCard>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Serviço"
        title={`Detalhes do serviço #${servico.id}`}
        description="Visualize os dados do serviço e siga para as etapas de documentação disponíveis."
        actions={
          <button className="btn btn--secondary" onClick={() => router.push('/dashboard')}>
            Voltar
          </button>
        }
        meta={
          <>
            <span className="badge badge--primary">OS {servico.os || '-'}</span>
            <span className="badge">{servico.client || 'Cliente não informado'}</span>
          </>
        }
      />

      <div className="split-grid">
        <div className="split-grid__main stack-lg">
          <SurfaceCard className="surface-card--hero">
            <div className="surface-card__header">
              <div>
                <h2 className="surface-card__title">Informações gerais</h2>
                <p className="surface-card__subtitle">
                  Resumo dos dados principais cadastrados para este serviço.
                </p>
              </div>
            </div>

            <div className="data-list">
              <div className="data-row">
                <span className="data-row__label">ID</span>
                <span className="data-row__value">{servico.id}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">OS</span>
                <span className="data-row__value">{servico.os}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">Cliente</span>
                <span className="data-row__value">{servico.client}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">Setor</span>
                <span className="data-row__value">{servico.sector}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">Sistema</span>
                <span className="data-row__value">{servico.system}</span>
              </div>
              <div className="data-row">
                <span className="data-row__label">Data de entrega</span>
                <span className="data-row__value">{servico.delivery_date}</span>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="surface-card__header">
              <div>
                <h2 className="surface-card__title">Documentações criadas</h2>
                <p className="surface-card__subtitle">
                  Registros já gerados para este serviço, com acesso direto para abertura.
                </p>
              </div>
              <div className="cluster">
                <span className="badge badge--primary">{documentacoes.length} registros</span>
              </div>
            </div>

            {erroDocumentacoes ? <p className="feedback-text feedback-text--error">{erroDocumentacoes}</p> : null}

            {documentacoes.length === 0 ? (
              <p className="muted">Nenhuma documentação foi criada para este serviço ainda.</p>
            ) : (
              <div className="documentation-plan__list">
                {documentacoes.map((documentacao) => (
                  <div key={documentacao.id} className="plan-item">
                    <div>
                      <strong>{documentacao.titulo || `Documentação #${documentacao.id}`}</strong>
                      {editingCodigoId === documentacao.id ? (
                        <div className="stack">
                          <Field label="Código">
                            <input
                              className="input"
                              value={codigoDraft}
                              onChange={(event) => setCodigoDraft(event.target.value)}
                            />
                          </Field>
                          <p className="muted">
                            {documentacao.categoria || 'Sem categoria'}
                            {documentacao.tipo ? ` • ${documentacao.tipo}` : ''}
                            {documentacao.modo_criacao_documentacao
                              ? ` • ${documentacao.modo_criacao_documentacao}`
                              : ''}
                          </p>
                        </div>
                      ) : (
                        <p className="muted">
                          {documentacao.categoria || 'Sem categoria'}
                          {documentacao.tipo ? ` • ${documentacao.tipo}` : ''}
                          {documentacao.codigo ? ` • ${documentacao.codigo}` : ''}
                          {documentacao.modo_criacao_documentacao
                            ? ` • ${documentacao.modo_criacao_documentacao}`
                            : ''}
                        </p>
                      )}
                    </div>
                    <div className="cluster">
                      {editingCodigoId === documentacao.id ? (
                        <>
                          <button
                            className="btn btn--primary"
                            onClick={() => salvarCodigoDocumentacao(documentacao.id)}
                            disabled={savingCodigoId === documentacao.id}
                          >
                            {savingCodigoId === documentacao.id ? 'Salvando...' : 'Salvar código'}
                          </button>
                          <button
                            className="btn btn--ghost"
                            onClick={() => {
                              setEditingCodigoId(null)
                              setCodigoDraft('')
                            }}
                            disabled={savingCodigoId === documentacao.id}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn--ghost"
                          onClick={() => iniciarEdicaoCodigo(documentacao)}
                        >
                          Editar código
                        </button>
                      )}
                      <button
                        className="btn btn--secondary"
                        onClick={() => router.push(`/dashboard/documentacoes/${documentacao.id}`)}
                        disabled={editingCodigoId === documentacao.id}
                      >
                        Abrir documentação
                      </button>
                      <button
                        className="btn btn--danger"
                        onClick={() => excluirDocumentacao(documentacao.id)}
                        disabled={
                          deletingDocumentacaoId === documentacao.id ||
                          editingCodigoId === documentacao.id
                        }
                      >
                        {deletingDocumentacaoId === documentacao.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="split-grid__side stack-lg">
          <SurfaceCard>
            <div className="surface-card__header">
              <div>
                <h2 className="surface-card__title">
                  {dadosGerais ? 'Dados gerais cadastrados' : 'Dados gerais'}
                </h2>
                <p className="surface-card__subtitle">
                  {dadosGerais
                    ? 'Resumo reaproveitado das documentações de qualificação já salvas para este serviço.'
                    : 'Nenhum dado geral foi encontrado ainda para este serviço.'}
                </p>
              </div>
              <div className="cluster">
                <button
                  className="btn btn--ghost"
                  onClick={() => setDadosGeraisExpanded((current) => !current)}
                >
                  {dadosGeraisExpanded ? 'Recolher' : 'Expandir'}
                </button>
                {editandoDadosGerais ? (
                  <>
                    <button
                      className="btn btn--primary"
                      onClick={salvarDadosGerais}
                      disabled={salvandoDadosGerais}
                    >
                      {salvandoDadosGerais ? 'Salvando...' : 'Salvar dados gerais'}
                    </button>
                    <button
                      className="btn btn--ghost"
                      onClick={() => {
                        setDadosGeraisForm(dadosGerais)
                        setEditandoDadosGerais(false)
                        setErroDadosGerais('')
                      }}
                      disabled={salvandoDadosGerais}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button className="btn btn--secondary" onClick={iniciarEdicaoDadosGerais}>
                    {dadosGerais ? 'Editar dados gerais' : 'Criar dados gerais'}
                  </button>
                )}
              </div>
            </div>

            {dadosGeraisExpanded ? (
              <>
                {erroDadosGerais ? <p className="feedback-text feedback-text--error">{erroDadosGerais}</p> : null}

                {editandoDadosGerais && dadosGeraisForm ? (
                  <div className="stack">
                    <div className="form-grid form-grid--single">
                      <Field label="Nome da empresa">
                        <input
                          className="input"
                          value={dadosGeraisForm.empresa.nome}
                          onChange={(event) => updateDadosGeraisForm('empresa', 'nome', event.target.value)}
                        />
                      </Field>
                      <Field label="Endereço">
                        <input
                          className="input"
                          value={dadosGeraisForm.empresa.endereco}
                          onChange={(event) => updateDadosGeraisForm('empresa', 'endereco', event.target.value)}
                        />
                      </Field>
                      <Field label="CEP">
                        <input
                          className="input"
                          value={dadosGeraisForm.empresa.cep}
                          onChange={(event) => updateDadosGeraisForm('empresa', 'cep', event.target.value)}
                        />
                      </Field>
                      <Field label="Nome do elaborador">
                        <input
                          className="input"
                          value={dadosGeraisForm.elaborador.nome}
                          onChange={(event) => updateDadosGeraisForm('elaborador', 'nome', event.target.value)}
                        />
                      </Field>
                      <Field label="Cargo do elaborador">
                        <input
                          className="input"
                          value={dadosGeraisForm.elaborador.cargo}
                          onChange={(event) => updateDadosGeraisForm('elaborador', 'cargo', event.target.value)}
                        />
                      </Field>
                      <Field label="Nome do revisor">
                        <input
                          className="input"
                          value={dadosGeraisForm.revisor.nome}
                          onChange={(event) => updateDadosGeraisForm('revisor', 'nome', event.target.value)}
                        />
                      </Field>
                      <Field label="Cargo do revisor">
                        <input
                          className="input"
                          value={dadosGeraisForm.revisor.cargo}
                          onChange={(event) => updateDadosGeraisForm('revisor', 'cargo', event.target.value)}
                        />
                      </Field>
                      <Field label="Nome do aprovador">
                        <input
                          className="input"
                          value={dadosGeraisForm.aprovador.nome}
                          onChange={(event) => updateDadosGeraisForm('aprovador', 'nome', event.target.value)}
                        />
                      </Field>
                      <Field label="Cargo do aprovador">
                        <input
                          className="input"
                          value={dadosGeraisForm.aprovador.cargo}
                          onChange={(event) => updateDadosGeraisForm('aprovador', 'cargo', event.target.value)}
                        />
                      </Field>
                      <Field label="Contato do aprovador">
                        <input
                          className="input"
                          value={dadosGeraisForm.aprovador.telefone}
                          onChange={(event) => updateDadosGeraisForm('aprovador', 'telefone', event.target.value)}
                        />
                      </Field>
                      <Field label="Email do aprovador">
                        <input
                          className="input"
                          type="email"
                          value={dadosGeraisForm.aprovador.email}
                          onChange={(event) => updateDadosGeraisForm('aprovador', 'email', event.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                ) : dadosGerais ? (
                  <div className="data-list">
                    <div className="data-row">
                      <span className="data-row__label">Origem</span>
                      <span className="data-row__value">{dadosGerais.documentacaoTitulo || `Documentação #${dadosGerais.documentacaoId}`}</span>
                    </div>
                    <div className="data-row">
                      <span className="data-row__label">Empresa</span>
                      <span className="data-row__value">{dadosGerais.empresa.nome || '-'}</span>
                    </div>
                    <div className="data-row">
                      <span className="data-row__label">Endereço</span>
                      <span className="data-row__value">{dadosGerais.empresa.endereco || '-'}</span>
                    </div>
                    <div className="data-row">
                      <span className="data-row__label">CEP</span>
                      <span className="data-row__value">{dadosGerais.empresa.cep || '-'}</span>
                    </div>
                    <div className="data-row">
                      <span className="data-row__label">Elaborador</span>
                      <span className="data-row__value">
                        {dadosGerais.elaborador.nome || '-'}
                        {dadosGerais.elaborador.cargo ? ` • ${dadosGerais.elaborador.cargo}` : ''}
                      </span>
                    </div>
                    <div className="data-row">
                      <span className="data-row__label">Revisor</span>
                      <span className="data-row__value">
                        {dadosGerais.revisor.nome || '-'}
                        {dadosGerais.revisor.cargo ? ` • ${dadosGerais.revisor.cargo}` : ''}
                      </span>
                    </div>
                    <div className="data-row">
                      <span className="data-row__label">Aprovador</span>
                      <span className="data-row__value">
                        {dadosGerais.aprovador.nome || '-'}
                        {dadosGerais.aprovador.cargo ? ` • ${dadosGerais.aprovador.cargo}` : ''}
                      </span>
                    </div>
                    <div className="data-row">
                      <span className="data-row__label">Contato</span>
                      <span className="data-row__value">{dadosGerais.aprovador.telefone || '-'}</span>
                    </div>
                    <div className="data-row">
                      <span className="data-row__label">Email</span>
                      <span className="data-row__value">{dadosGerais.aprovador.email || '-'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="muted">
                    Use o botão acima para informar os dados gerais diretamente nesta tela.
                  </p>
                )}
              </>
            ) : null}
          </SurfaceCard>

          <SurfaceCard>
            <div className="surface-card__header">
              <div>
                <h2 className="surface-card__title">Ações</h2>
                <p className="surface-card__subtitle">
                  Atalhos para os próximos passos relacionados ao serviço.
                </p>
              </div>
            </div>

            <div className="stack">
              <button
                className="btn btn--primary"
                onClick={() => router.push(`/dashboard/servico/${servico.id}/documentacao`)}
              >
                Criar documentação
              </button>

              <button className="btn btn--secondary">Ver formulários</button>

              <button className="btn btn--ghost">Gerar PDF</button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </PageShell>
  )
}
