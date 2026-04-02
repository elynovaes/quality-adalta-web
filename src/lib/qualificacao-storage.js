const STORAGE_PREFIX = 'quality-adalta-web:qualificacao-flow'

function obterChave(servicoId) {
  return `${STORAGE_PREFIX}:${servicoId}`
}

export function salvarFluxoQualificacaoLocal(servicoId, payload) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(obterChave(servicoId), JSON.stringify(payload))
}

export function carregarFluxoQualificacaoLocal(servicoId) {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.sessionStorage.getItem(obterChave(servicoId))

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue)
  } catch (error) {
    console.log(error)
    return null
  }
}
