export const qualificationTypesConfig = {
  iq: {
    id: 'iq',
    label: 'IQ',
    category: 'Qualificação',
  },
  oq: {
    id: 'oq',
    label: 'OQ',
    category: 'Qualificação',
  },
  pq: {
    id: 'pq',
    label: 'PQ',
    category: 'Qualificação',
  },
}

export const documentTypesConfig = {
  protocolo: {
    id: 'protocolo',
    label: 'Protocolo',
  },
  relatorio: {
    id: 'relatorio',
    label: 'Relatório',
  },
}

export const qualificationTypeIds = Object.keys(qualificationTypesConfig)
export const documentTypeIds = Object.keys(documentTypesConfig)

export function formatQualificationType(id) {
  return qualificationTypesConfig[id]?.label || String(id).toUpperCase()
}

export function formatDocumentType(id) {
  return documentTypesConfig[id]?.label || id
}
