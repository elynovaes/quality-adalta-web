import { supabase } from '@/lib/supabase'

export async function fetchServicoResumo(servicoId) {
  const { data, error } = await supabase
    .from('servicos')
    .select('id, os, client, system')
    .eq('id', servicoId)
    .single()

  if (error) {
    throw new Error(`Erro ao carregar serviço ${servicoId}: ${error.message}`)
  }

  return {
    id: data.id,
    os: data.os || '',
    cliente: data.client || '',
    sistema: data.system || '',
  }
}
