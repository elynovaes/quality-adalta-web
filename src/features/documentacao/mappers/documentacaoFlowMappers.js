import {
  createEmptyDocumentSelection,
  createEmptyGeneralData,
  createInitialDocumentacaoFlowState,
  createSystemDraft,
} from '@/types/documentacao-flow'
import {
  documentTypeIds,
  formatDocumentType,
  formatQualificationType,
  qualificationTypeIds,
} from '@/features/documentacao/config/qualificationConfig'

export function createDocumentConfiguration() {
  return qualificationTypeIds.reduce((acc, typeId) => {
    acc[typeId] = createEmptyDocumentSelection()
    return acc
  }, {})
}

export function normalizeDocumentConfiguration(data = {}) {
  return qualificationTypeIds.reduce((acc, typeId) => {
    acc[typeId] = {
      ...createEmptyDocumentSelection(),
      ...(data?.[typeId] || {}),
    }
    return acc
  }, {})
}

export function normalizeGeneralData(data = null) {
  const source = data || {}
  const empresa = source?.empresa || {}
  const elaborador = source?.elaborador || {}
  const revisor = source?.revisor || {}
  const aprovador = source?.aprovador || {}
  const base = createEmptyGeneralData()

  return {
    empresa: {
      ...base.empresa,
      nome: empresa.nome || source?.nome_empresa || source?.cliente || '',
      endereco: empresa.endereco || source?.endereco_local || source?.unidadeLocal || '',
      cep: empresa.cep || source?.cep || '',
    },
    elaborador: {
      ...base.elaborador,
      nome: elaborador.nome || source?.elaborador || source?.responsavelElaboracao || '',
      cargo: elaborador.cargo || source?.cargo_elaborador || '',
    },
    revisor: {
      ...base.revisor,
      nome: revisor.nome || source?.revisor || source?.responsavelRevisao || '',
      cargo: revisor.cargo || source?.cargo_revisor || '',
    },
    aprovador: {
      ...base.aprovador,
      nome: aprovador.nome || source?.aprovador || '',
      cargo:
        aprovador.cargo || source?.cargo_aprovador || source?.area_profissional_aprovador || '',
      telefone: aprovador.telefone || source?.contato_aprovador || '',
      email: aprovador.email || source?.email_aprovador || '',
    },
    logoCliente:
      source?.logoCliente ||
      (source?.logo_cliente
        ? {
            fileName: source.logo_cliente.split('/').pop() || 'logo',
            storagePath: source.logo_cliente,
            publicUrl: source.logo_cliente,
          }
        : null),
  }
}

export function normalizeSystemDraft(system, index) {
  const fallback = createSystemDraft(index, createDocumentConfiguration)

  return {
    ...fallback,
    ...system,
    localId: system?.localId || fallback.localId,
    id: system?.id || null,
    nome: system?.nome || fallback.nome,
    codigo: system?.codigo || '',
    systemNumber: system?.systemNumber || fallback.systemNumber,
    documentosQualificacao: normalizeDocumentConfiguration(system?.documentosQualificacao),
  }
}

export function createInitialFlowState() {
  return createInitialDocumentacaoFlowState(createDocumentConfiguration)
}

export function summarizeSelections({ groupedDocuments, sistemas, modoCriacaoDocumentacao }) {
  const sources =
    modoCriacaoDocumentacao === 'agrupado'
      ? [groupedDocuments]
      : sistemas.map((system) => system.documentosQualificacao)

  const qualificacoes = qualificationTypeIds.reduce((acc, typeId) => {
    acc[typeId] = sources.some((config) => config?.[typeId]?.ativo)
    return acc
  }, {})

  const tiposDocumento = documentTypeIds.reduce((acc, documentTypeId) => {
    const flagName = `${documentTypeId}Selecionado`
    acc[documentTypeId] = sources.some((config) =>
      qualificationTypeIds.some((typeId) => config?.[typeId]?.[flagName])
    )
    return acc
  }, {})

  return { qualificacoes, tiposDocumento }
}

export function applySystemCount(currentSystems, quantity) {
  const normalizedQuantity = Math.max(1, Number(quantity) || 1)
  const nextSystems = Array.from({ length: normalizedQuantity }, (_, index) => {
    if (currentSystems[index]) {
      return normalizeSystemDraft(currentSystems[index], index)
    }

    return createSystemDraft(index, createDocumentConfiguration)
  })

  return nextSystems
}

export function buildResumeViewModel(plan) {
  return {
    groups: plan,
    totalDocuments: plan.reduce((sum, group) => sum + group.documentos.length, 0),
  }
}

export function createDocumentTitle({ documentTypeId, qualificationTypeId, systemNames }) {
  return `${formatDocumentType(documentTypeId)} ${formatQualificationType(qualificationTypeId)} - ${systemNames.join(' + ')}`
}
