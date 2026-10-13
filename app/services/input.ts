const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** عدد را از ورودی کاربر (با کاما، ارقام فارسی، فاصله) استخراج میکند. */
export function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (v === null || v === undefined) return 0
  const s = String(v)
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[،,\s\u200c]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export function toInt(v: unknown): number {
  return Math.round(toNumber(v))
}

/** خروجی با کاماگذاری سهبهسه، ارقام لاتین (برای فیلدهای input). */
export function formatAmount(n: number | bigint | null | undefined): string {
  if (n === null || n === undefined) return '0'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(Number(n)))
}
