import {
  documentTypeIds,
  formatDocumentType,
  formatQualificationType,
  qualificationTypeIds,
} from '@/features/documentacao/config/qualificationConfig'
import {
  createDocumentConfiguration,
  createInitialFlowState,
  normalizeDocumentConfiguration,
  normalizeGeneralData,
  normalizeSystemDraft,
} from '@/features/documentacao/mappers/documentacaoFlowMappers'
import { createSystemDraft } from '@/types/documentacao-flow'
import { buildDocumentationSet } from '@/features/documentacao/utils/buildDocumentationSet'
import { MODO_CRIACAO_DOCUMENTACAO } from '@/types/documentacao-flow'

export const TIPOS_QUALIFICACAO = qualificationTypeIds
export const TIPOS_ARQUIVO = documentTypeIds
export const MODOS_CRIACAO_DOCUMENTACAO = Object.values(MODO_CRIACAO_DOCUMENTACAO)

export function formatarTipoQualificacao(tipo) {
  return formatQualificationType(tipo)
}

export function formatarTipoArquivo(tipo) {
  return formatDocumentType(tipo)
}

export function formatarModoCriacaoDocumentacao(modo) {
  return modo === MODO_CRIACAO_DOCUMENTACAO.AGRUPADO
    ? 'Documentação única para todos os sistemas'
    : 'Documentação separada por sistema'
}

export function criarDocumentoQualificacaoVazio() {
  return {
    ativo: false,
    protocoloSelecionado: false,
    relatorioSelecionado: false,
    protocoloCodigo: '',
    relatorioCodigo: '',
  }
}

export function criarConfiguracaoDocumentosVazia() {
  return createDocumentConfiguration()
}

export function criarSistemaVazio(systemNumber) {
  return normalizeSystemDraft({ systemNumber }, systemNumber - 1)
}

export function normalizarSistema(system, index) {
  return normalizeSystemDraft(system, index)
}

export { normalizeGeneralData as normalizarGeneralData }
export { normalizeDocumentConfiguration as normalizarConfiguracaoDocumentos }

export function parseJsonParam(param, fallback) {
  if (!param) {
    return fallback
  }

  try {
    return JSON.parse(param)
  } catch (error) {
    console.log(error)
    return fallback
  }
}

export function criarListaSistemas(numeroSistemas) {
  return Array.from({ length: Math.max(1, Number(numeroSistemas) || 1) }, (_, index) =>
    normalizeSystemDraft(createSystemDraft(index, createDocumentConfiguration), index)
  )
}

export function serializarFluxoQualificacao({ numeroSistemas, modoCriacaoDocumentacao, systems, groupedDocuments }) {
  const params = new URLSearchParams({
    numeroSistemas: String(numeroSistemas),
    modoCriacaoDocumentacao,
  })

  if (systems) {
    params.set('systemsData', JSON.stringify(systems))
  }

  if (groupedDocuments) {
    params.set('groupedDocuments', JSON.stringify(groupedDocuments))
  }

  return params
}

export function gerarPlanoDocumentacoes({ modoCriacaoDocumentacao, systems, groupedDocuments }) {
  return buildDocumentationSet({
    ...createInitialFlowState(),
    modoCriacaoDocumentacao,
    sistemas: systems,
    groupedDocuments,
  }).map((group) => ({
    id: group.id,
    titulo: group.title,
    descricao: group.description,
    systems: group.systems,
    documentos: group.documentos.map((documento) => ({
      ...documento,
      tipo: documento.qualificationTypeId,
      tipoArquivo: documento.documentTypeId,
      codigo: documento.code,
      titulo: documento.title,
      tipoBanco: documento.bancoTipo,
    })),
  }))
}

export function contarDocumentacoesPlano(plano) {
  return plano.reduce((total, group) => total + group.documentos.length, 0)
}
