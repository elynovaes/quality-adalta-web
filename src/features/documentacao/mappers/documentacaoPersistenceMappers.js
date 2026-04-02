import { buildDocumentationSet } from '@/features/documentacao/utils/buildDocumentationSet'
import { MODO_CRIACAO_DOCUMENTACAO } from '@/types/documentacao-flow'

export function mapFlowToDocumentacaoPayload({ serviceId, dadosGerais, document }) {
  const payload = {
    servico_id: serviceId,
    categoria: 'Qualificação',
    tipo: document.bancoTipo,
    titulo: document.title,
    codigo: document.code || null,
    nome_empresa: dadosGerais.empresa?.nome || null,
    endereco_local: dadosGerais.empresa?.endereco || null,
    cep: dadosGerais.empresa?.cep || null,
    elaborador: dadosGerais.elaborador?.nome || null,
    revisor: dadosGerais.revisor?.nome || null,
    aprovador: dadosGerais.aprovador?.nome || null,
    area_profissional_aprovador: dadosGerais.aprovador?.cargo || null,
    contato_aprovador: dadosGerais.aprovador?.telefone || null,
    email_aprovador: dadosGerais.aprovador?.email || null,
    modo_criacao_documentacao: document.systems.length > 1
      ? MODO_CRIACAO_DOCUMENTACAO.AGRUPADO
      : MODO_CRIACAO_DOCUMENTACAO.POR_SISTEMA,
  }

  if (dadosGerais.elaborador?.cargo) {
    payload.cargo_elaborador = dadosGerais.elaborador.cargo
  }

  if (dadosGerais.revisor?.cargo) {
    payload.cargo_revisor = dadosGerais.revisor.cargo
  }

  if (dadosGerais.aprovador?.cargo) {
    payload.cargo_aprovador = dadosGerais.aprovador.cargo
  }

  if (dadosGerais.logoCliente?.publicUrl) {
    payload.logo_cliente = dadosGerais.logoCliente.publicUrl
  }

  return payload
}

export function mapFlowToPersistenceModel(flowState) {
  const plan = buildDocumentationSet(flowState)

  return plan.map((group) => ({
    ...group,
    documentsPayload: group.documentos.map((document) => ({
      ...document,
      systems: group.systems,
      payload: mapFlowToDocumentacaoPayload({
        serviceId: flowState.serviceId,
        dadosGerais: flowState.dadosGerais,
        document: {
          ...document,
          systems: group.systems,
        },
      }),
    })),
  }))
}
