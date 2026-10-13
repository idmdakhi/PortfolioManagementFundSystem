export type SplitMode = 'equal' | 'percent' | 'amount'

/**
 * Splits one movement among several people (whole rials).
 * equal: total / n, leftover rials go one each to the first people.
 * percent: values are percentages that must add up to 100; leftover goes to the largest share.
 * amount: values are the amounts; the total is their sum.
 */
export function splitAmount(mode: SplitMode, total: number, values: number[]): { amounts: number[] } | { error: string } {
  const n = values.length
  if (n === 0) return { error: 'هیچ سرمایه‌گذاری انتخاب نشده است.' }
  let amounts: number[]
  if (mode === 'amount') {
    amounts = values.map((v) => Math.round(v))
  } else {
    if (!(total > 0)) return { error: 'مبلغ کل را وارد کنید.' }
    total = Math.round(total)
    if (mode === 'equal') {
      const base = Math.floor(total / n)
      const rem = total - base * n
      amounts = values.map((_, i) => base + (i < rem ? 1 : 0))
    } else {
      const sum = values.reduce((a, v) => a + v, 0)
      if (Math.abs(sum - 100) > 0.001) return { error: 'مجموع درصدها باید ۱۰۰ باشد.' }
      amounts = values.map((v) => Math.floor((total * v) / 100))
      const rem = total - amounts.reduce((a, v) => a + v, 0)
      amounts[values.indexOf(Math.max(...values))] += rem
    }
  }
  if (amounts.some((a) => !(a > 0))) return { error: 'مبلغ هر نفر باید بیشتر از صفر باشد.' }
  return { amounts }
}
