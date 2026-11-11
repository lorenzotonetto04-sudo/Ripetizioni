// Data di oggi nel formato AAAA-MM-GG (fuso orario del dispositivo)
export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// "2026-11-12" -> "gio 12 novembre"
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

// "15:00:00", "16:30:00" -> "15:00–16:30"
export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start) return ''
  const s = start.slice(0, 5)
  return end ? `${s}–${end.slice(0, 5)}` : s
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatGrade(value: number | string): string {
  return Number(value).toLocaleString('it-IT', { maximumFractionDigits: 2 })
}

export const KIND_LABEL: Record<string, string> = {
  orale: 'Orale',
  scritta: 'Scritta',
  quiz: 'Quiz',
  esercizio: 'Esercizio',
}
