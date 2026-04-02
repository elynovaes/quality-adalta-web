import { supabase } from '@/lib/supabase'

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPTED_CONTENT_TYPES = ['image/png', 'image/jpeg']
export const CLIENT_LOGO_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_LOGO_BUCKET || 'logos-clientes'

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9.-]+/g, '-').toLowerCase()
}

export function validateLogoFile(file) {
  if (!file) {
    throw new Error('Selecione uma imagem PNG ou JPG.')
  }

  if (!ACCEPTED_CONTENT_TYPES.includes(file.type)) {
    throw new Error('Envie uma imagem PNG ou JPG.')
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('A logo deve ter no máximo 2 MB.')
  }
}

export async function uploadClientLogo({ serviceId, file, previousStoragePath = null }) {
  validateLogoFile(file)

  const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`
  const storagePath = `servicos/${serviceId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(CLIENT_LOGO_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) {
    throw new Error(`Erro ao enviar logo para o Storage: ${uploadError.message}`)
  }

  if (previousStoragePath && previousStoragePath !== storagePath) {
    await supabase.storage.from(CLIENT_LOGO_BUCKET).remove([previousStoragePath])
  }

  const { data } = supabase.storage.from(CLIENT_LOGO_BUCKET).getPublicUrl(storagePath)

  return {
    fileName: file.name,
    storagePath,
    publicUrl: data.publicUrl,
  }
}

export async function removeClientLogo(storagePath) {
  if (!storagePath) {
    return
  }

  const { error } = await supabase.storage.from(CLIENT_LOGO_BUCKET).remove([storagePath])

  if (error) {
    throw new Error(`Erro ao remover logo do Storage: ${error.message}`)
  }
}
