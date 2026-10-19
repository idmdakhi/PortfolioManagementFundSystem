/**
 * CSV for Excel: UTF-8 BOM (so Persian opens correctly), CRLF lines, quoted when needed.
 * Text cells that start with = + - @ (or tab/CR) are prefixed with ' so Excel never runs them as formulas.
 * Numbers are written as numbers (a negative amount is not "text starting with -").
 */
export type Cell = string | number | null | undefined

export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return ''
  let s = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: Cell[][]): string {
  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
