export const api = {
  get investors() { return window.api.investors },
  get accounts() { return window.api.accounts },
  get transactions() { return window.api.transactions },
  get settings() { return window.api.settings },
  get periods() { return window.api.periods },
  get valuations() { return window.api.valuations }
}
export function formatRial(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return new Intl.NumberFormat('fa-IR').format(Math.round(value))
}
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || isNaN(value)) return '—'
  return new Intl.NumberFormat('fa-IR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) + '٪'
}
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return dateStr
}
