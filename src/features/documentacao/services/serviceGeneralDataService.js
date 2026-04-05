import { normalizeGeneralData } from '@/features/documentacao/mappers/documentacaoFlowMappers'
import { supabase } from '@/lib/supabase'

const GENERAL_DATA_SELECT =
  'id, titulo, nome_empresa, endereco_local, cep, elaborador, cargo_elaborador, revisor, cargo_revisor, aprovador, cargo_aprovador, area_profissional_aprovador, contato_aprovador, email_aprovador, logo_cliente'
const GENERAL_DATA_FALLBACK_SELECT =
  'id, titulo, nome_empresa, endereco_local, cep, elaborador, revisor, aprovador, area_profissional_aprovador, contato_aprovador, email_aprovador'

function mapGeneralDataToDocumentacaoColumns(dadosGerais) {
  const payload = {
    nome_empresa: dadosGerais.empresa?.nome || null,
    endereco_local: dadosGerais.empresa?.endereco || null,
    cep: dadosGerais.empresa?.cep || null,
    elaborador: dadosGerais.elaborador?.nome || null,
    revisor: dadosGerais.revisor?.nome || null,
    aprovador: dadosGerais.aprovador?.nome || null,
    area_profissional_aprovador: dadosGerais.aprovador?.cargo || null,
    contato_aprovador: dadosGerais.aprovador?.telefone || null,
    email_aprovador: dadosGerais.aprovador?.email || null,
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

function stripOptionalColumns(payload) {
  const fallback = { ...payload }
  delete fallback.cargo_elaborador
  delete fallback.cargo_revisor
  delete fallback.cargo_aprovador
  delete fallback.logo_cliente
  return fallback
}

function toServiceGeneralData(documentacaoBase) {
  if (!documentacaoBase) {
    return null
  }

  return {
    documentacaoId: documentacaoBase.id,
    documentacaoTitulo: documentacaoBase.titulo,
    ...normalizeGeneralData(documentacaoBase),
  }
}

export async function fetchServiceGeneralData(serviceId) {
  let { data, error } = await supabase
    .from('documentacoes')
    .select(GENERAL_DATA_SELECT)
    .eq('servico_id', serviceId)
    .eq('categoria', 'Qualificação')
    .order('id', { ascending: false })
    .limit(1)

  if (error && /cargo_elaborador|cargo_revisor|cargo_aprovador|logo_cliente/i.test(error.message || '')) {
    const fallback = await supabase
      .from('documentacoes')
      .select(GENERAL_DATA_FALLBACK_SELECT)
      .eq('servico_id', serviceId)
      .eq('categoria', 'Qualificação')
      .order('id', { ascending: false })
      .limit(1)

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    throw new Error(`Erro ao carregar dados gerais do serviço: ${error.message}`)
  }

  const documentacaoBase = data?.[0]

  if (!documentacaoBase) {
    return null
  }

  return toServiceGeneralData(documentacaoBase)
}

export async function updateServiceGeneralData(serviceId, dadosGerais) {
  const payload = mapGeneralDataToDocumentacaoColumns(dadosGerais)

  let { error } = await supabase
    .from('documentacoes')
    .update(payload)
    .eq('servico_id', serviceId)
    .eq('categoria', 'Qualificação')

  if (error && /cargo_elaborador|cargo_revisor|cargo_aprovador|logo_cliente/i.test(error.message || '')) {
    const fallback = await supabase
      .from('documentacoes')
      .update(stripOptionalColumns(payload))
      .eq('servico_id', serviceId)
      .eq('categoria', 'Qualificação')

    error = fallback.error
  }

  if (error) {
    throw new Error(`Erro ao atualizar dados gerais do serviço: ${error.message}`)
  }

  return fetchServiceGeneralData(serviceId)
}

export { toServiceGeneralData }
