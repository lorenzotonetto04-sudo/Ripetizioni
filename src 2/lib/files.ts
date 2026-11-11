import { supabase } from './supabase'

const BUCKET = 'materials'
export const MAX_FILE_MB = 20

// Nome file sicuro per l'archivio (niente accenti, spazi o simboli)
export function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
  return cleaned.slice(-80)
}

export function fileExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 && i < name.length - 1 ? name.slice(i + 1).toUpperCase().slice(0, 5) : 'FILE'
}

// Il file è privato: si apre con un link temporaneo (2 minuti) generato solo
// se le regole del database consentono a questo utente di leggerlo.
export async function openFile(path: string) {
  const w = window.open('', '_blank')
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120)
  if (error || !data) {
    w?.close()
    throw new Error('Impossibile aprire il file: ' + (error?.message ?? 'errore'))
  }
  if (w) w.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}

export async function downloadFile(path: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 120, { download: fileName })
  if (error || !data) {
    throw new Error('Impossibile scaricare il file: ' + (error?.message ?? 'errore'))
  }
  window.location.href = data.signedUrl
}

export async function uploadFile(path: string, file: File) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw new Error('Caricamento del file non riuscito: ' + error.message)
}

export async function removeFile(path: string) {
  await supabase.storage.from(BUCKET).remove([path])
}
