export type SplitMode = 'equal' | 'percent' | 'amount' | 'weight'

export interface SplitOpts {
  /** Round every share down to a multiple of this (rials); the leftover goes to the largest share. */
  roundTo?: number
}

/**
 * Splits one movement among several people (whole rials). The total is always preserved.
 * equal:   total / n.
 * percent: values are percentages that must add up to 100.
 * weight:  values are weights (any positive numbers, e.g. 2:1:1, units held, capital).
 * amount:  values are the amounts; the total is their sum (roundTo is ignored).
 */
export function splitAmount(
  mode: SplitMode, total: number, values: number[], opts: SplitOpts = {}
): { amounts: number[] } | { error: string } {
  const n = values.length
  if (n === 0) return { error: 'هیچ سرمایه‌گذاری انتخاب نشده است.' }
  const roundTo = Math.max(1, Math.round(opts.roundTo ?? 1))
  let amounts: number[]
  if (mode === 'amount') {
    amounts = values.map((v) => Math.round(v))
  } else {
    if (!(total > 0)) return { error: 'مبلغ کل را وارد کنید.' }
    total = Math.round(total)
    let shares: number[]
    if (mode === 'equal') {
      shares = values.map(() => 1)
    } else if (mode === 'percent') {
      const sum = values.reduce((a, v) => a + v, 0)
      if (Math.abs(sum - 100) > 0.001) return { error: 'مجموع درصدها باید ۱۰۰ باشد.' }
      shares = values
    } else {
      if (values.some((v) => !(v >= 0))) return { error: 'وزن‌ها نمی‌توانند منفی باشند.' }
      if (!(values.reduce((a, v) => a + v, 0) > 0)) return { error: 'جمع وزن‌ها باید بیشتر از صفر باشد.' }
      shares = values
    }
    const sum = shares.reduce((a, v) => a + v, 0)
    const unit = roundTo > 1 ? roundTo : 1
    amounts = shares.map((s) => Math.floor((total * s) / sum / unit) * unit)
    let rem = total - amounts.reduce((a, v) => a + v, 0)
    if (unit === 1 && mode === 'equal') {
      // spread leftover rials one by one over the first people
      for (let i = 0; rem > 0; i = (i + 1) % n, rem--) amounts[i] += 1
    } else {
      amounts[shares.indexOf(Math.max(...shares))] += rem
    }
  }
  if (amounts.some((a) => !(a > 0))) return { error: 'مبلغ هر نفر باید بیشتر از صفر باشد.' }
  return { amounts }
}
