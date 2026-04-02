import {
  documentTypeIds,
  formatDocumentType,
  formatQualificationType,
  qualificationTypeIds,
} from '@/features/documentacao/config/qualificationConfig'
import { createDocumentTitle, normalizeSystemDraft } from '@/features/documentacao/mappers/documentacaoFlowMappers'
import { MODO_CRIACAO_DOCUMENTACAO } from '@/types/documentacao-flow'

function getSelectedDocuments(config) {
  return qualificationTypeIds.flatMap((qualificationTypeId) => {
    const selected = config?.[qualificationTypeId]

    if (!selected?.ativo) {
      return []
    }

    return documentTypeIds.flatMap((documentTypeId) => {
      const flagName = `${documentTypeId}Selecionado`
      const codeName = `${documentTypeId}Codigo`

      if (!selected?.[flagName]) {
        return []
      }

      return [
        {
          qualificationTypeId,
          documentTypeId,
          code: selected?.[codeName] || '',
          bancoTipo: `${formatDocumentType(documentTypeId).toUpperCase()} ${formatQualificationType(qualificationTypeId)}`,
        },
      ]
    })
  })
}

export function buildDocumentationSet(flowState) {
  const systems = flowState.sistemas.map((system, index) => normalizeSystemDraft(system, index))

  if (flowState.modoCriacaoDocumentacao === MODO_CRIACAO_DOCUMENTACAO.AGRUPADO) {
    return [
      {
        id: 'agrupado',
        title: 'Todos os sistemas juntos',
        description: `${systems.length} sistemas vinculados ao mesmo conjunto de documentos`,
        systems,
        documentos: getSelectedDocuments(flowState.groupedDocuments).map((documento) => ({
          ...documento,
          title: createDocumentTitle({
            documentTypeId: documento.documentTypeId,
            qualificationTypeId: documento.qualificationTypeId,
            systemNames: systems.map((item) => item.nome),
          }),
        })),
      },
    ]
  }

  return systems.map((system) => ({
    id: system.localId,
    title: system.nome,
    description: `Documentações independentes do ${system.nome}`,
    systems: [system],
    documentos: getSelectedDocuments(system.documentosQualificacao).map((documento) => ({
      ...documento,
      systemLocalId: system.localId,
      title: createDocumentTitle({
        documentTypeId: documento.documentTypeId,
        qualificationTypeId: documento.qualificationTypeId,
        systemNames: [system.nome],
      }),
    })),
  }))
}
