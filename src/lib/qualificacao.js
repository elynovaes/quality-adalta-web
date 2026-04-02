export const TIPOS_QUALIFICACAO = ['iq', 'oq', 'pq']
export const TIPOS_ARQUIVO = ['protocolo', 'relatorio']
export const MODOS_CRIACAO_DOCUMENTACAO = ['agrupado', 'por_sistema']

export function formatarTipoQualificacao(tipo) {
  return tipo.toUpperCase()
}

export function formatarTipoArquivo(tipoArquivo) {
  return tipoArquivo === 'protocolo' ? 'Protocolo' : 'Relatório'
}

export function formatarModoCriacaoDocumentacao(modo) {
  return modo === 'agrupado'
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
  return TIPOS_QUALIFICACAO.reduce((acc, tipo) => {
    acc[tipo] = criarDocumentoQualificacaoVazio()
    return acc
  }, {})
}

export function criarSistemaVazio(systemNumber) {
  return {
    systemNumber,
    nome: `Sistema ${systemNumber}`,
    documentosQualificacao: criarConfiguracaoDocumentosVazia(),
  }
}

export function normalizarSistema(system, index) {
  const documentosQualificacao = TIPOS_QUALIFICACAO.reduce((acc, tipo) => {
    const documentoAtual = system?.documentosQualificacao?.[tipo] || {}

    acc[tipo] = {
      ...criarDocumentoQualificacaoVazio(),
      ...documentoAtual,
    }

    return acc
  }, {})

  return {
    systemNumber: system?.systemNumber || index + 1,
    nome: system?.nome || `Sistema ${index + 1}`,
    documentosQualificacao,
  }
}

export function normalizarGeneralData(data = {}) {
  const empresa = data?.empresa || {}
  const elaborador = data?.elaborador || {}
  const revisor = data?.revisor || {}
  const aprovador = data?.aprovador || {}

  return {
    empresa: {
      nome: empresa.nome || data?.nome_empresa || data?.cliente || '',
      endereco: empresa.endereco || data?.endereco_local || data?.unidadeLocal || '',
      cep: empresa.cep || data?.cep || '',
    },
    elaborador: {
      nome: elaborador.nome || data?.elaborador || data?.responsavelElaboracao || '',
      cargo: elaborador.cargo || data?.cargo_elaborador || '',
    },
    revisor: {
      nome: revisor.nome || data?.revisor || data?.responsavelRevisao || '',
      cargo: revisor.cargo || data?.cargo_revisor || '',
    },
    aprovador: {
      nome: aprovador.nome || data?.aprovador || '',
      cargo: aprovador.cargo || data?.cargo_aprovador || data?.area_profissional_aprovador || '',
      telefone: aprovador.telefone || data?.contato_aprovador || '',
      email: aprovador.email || data?.email_aprovador || '',
    },
    logoCliente: data?.logoCliente || data?.logo_cliente || '',
  }
}

export function normalizarConfiguracaoDocumentos(data) {
  const origem = data || {}

  return TIPOS_QUALIFICACAO.reduce((acc, tipo) => {
    acc[tipo] = {
      ...criarDocumentoQualificacaoVazio(),
      ...(origem[tipo] || {}),
    }

    return acc
  }, {})
}

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
  return Array.from({ length: numeroSistemas }, (_, index) => criarSistemaVazio(index + 1))
}

export function serializarFluxoQualificacao({
  numeroSistemas,
  modoCriacaoDocumentacao,
  generalData,
  systems,
  groupedDocuments,
}) {
  const params = new URLSearchParams({
    numeroSistemas: String(numeroSistemas),
    modoCriacaoDocumentacao,
  })

  if (generalData) {
    params.set('generalData', JSON.stringify(generalData))
  }

  if (systems) {
    params.set('systemsData', JSON.stringify(systems))
  }

  if (groupedDocuments) {
    params.set('groupedDocuments', JSON.stringify(groupedDocuments))
  }

  return params
}

export function obterConfiguracaoDocumentosAtivos(configuracao = {}) {
  return TIPOS_QUALIFICACAO.flatMap((tipo) => {
    const documento = configuracao[tipo]

    if (!documento?.ativo) {
      return []
    }

    return TIPOS_ARQUIVO.flatMap((tipoArquivo) => {
      const campoSelecao = `${tipoArquivo}Selecionado`
      const campoCodigo = `${tipoArquivo}Codigo`

      if (!documento[campoSelecao]) {
        return []
      }

      return [
        {
          tipo,
          tipoArquivo,
          codigo: documento[campoCodigo] || '',
        },
      ]
    })
  })
}

export function gerarPlanoDocumentacoes({ modoCriacaoDocumentacao, systems, groupedDocuments }) {
  const systemsNormalizados = systems.map((system, index) => normalizarSistema(system, index))

  if (modoCriacaoDocumentacao === 'agrupado') {
    const documentos = obterConfiguracaoDocumentosAtivos(groupedDocuments).map((item) => ({
      ...item,
      titulo: `${formatarTipoArquivo(item.tipoArquivo)} ${formatarTipoQualificacao(item.tipo)} - ${systemsNormalizados.map((system) => system.nome).join(' + ')}`,
      tipoBanco: `${formatarTipoArquivo(item.tipoArquivo).toUpperCase()} ${formatarTipoQualificacao(item.tipo)}`,
    }))

    return [
      {
        id: 'agrupado',
        titulo: 'Todos os sistemas juntos',
        descricao: `${systemsNormalizados.length} sistemas vinculados ao mesmo conjunto de documentos`,
        systems: systemsNormalizados,
        documentos,
      },
    ]
  }

  return systemsNormalizados.map((system) => ({
    id: `sistema-${system.systemNumber}`,
    titulo: system.nome,
    descricao: `Documentações independentes do ${system.nome}`,
    systems: [system],
    documentos: obterConfiguracaoDocumentosAtivos(system.documentosQualificacao).map((item) => ({
      ...item,
      titulo: `${formatarTipoArquivo(item.tipoArquivo)} ${formatarTipoQualificacao(item.tipo)} - ${system.nome}`,
      tipoBanco: `${formatarTipoArquivo(item.tipoArquivo).toUpperCase()} ${formatarTipoQualificacao(item.tipo)}`,
      systemNumber: system.systemNumber,
      systemName: system.nome,
    })),
  }))
}

export function contarDocumentacoesPlano(plano) {
  return plano.reduce((total, grupo) => total + grupo.documentos.length, 0)
}
