export const MODO_CRIACAO_DOCUMENTACAO = {
  AGRUPADO: 'agrupado',
  POR_SISTEMA: 'por_sistema',
}

export function createEmptyDocumentSelection() {
  return {
    ativo: false,
    protocoloSelecionado: false,
    relatorioSelecionado: false,
    protocoloCodigo: '',
    relatorioCodigo: '',
  }
}

export function createEmptyGeneralData() {
  return {
    empresa: {
      nome: '',
      endereco: '',
      cep: '',
    },
    elaborador: {
      nome: '',
      cargo: '',
    },
    revisor: {
      nome: '',
      cargo: '',
    },
    aprovador: {
      nome: '',
      cargo: '',
      telefone: '',
      email: '',
    },
    logoCliente: null,
  }
}

export function createSystemDraft(index, documentsFactory) {
  return {
    localId: `system-${index + 1}`,
    id: null,
    nome: `Sistema ${index + 1}`,
    codigo: '',
    systemNumber: index + 1,
    documentosQualificacao: documentsFactory(),
  }
}

export function createInitialDocumentacaoFlowState(documentsFactory) {
  return {
    serviceId: null,
    os: '',
    cliente: '',
    quantidadeSistemas: 1,
    sistemas: [createSystemDraft(0, documentsFactory)],
    modoCriacaoDocumentacao: MODO_CRIACAO_DOCUMENTACAO.AGRUPADO,
    qualificacoes: {
      iq: false,
      oq: false,
      pq: false,
    },
    tiposDocumento: {
      protocolo: false,
      relatorio: false,
    },
    groupedDocuments: documentsFactory(),
    dadosGerais: createEmptyGeneralData(),
    resumoCriacao: null,
    documentacaoIds: [],
    serviceSnapshot: null,
    logoUpload: {
      uploading: false,
      error: '',
    },
  }
}
