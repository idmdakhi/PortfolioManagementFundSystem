import db from '@adonisjs/lucid/services/db'

/** NAV every fund unit is brought to by a split (the usual 1,000 rials per unit). */
export const TARGET_NAV = 1000

/**
 * Split factor that turns `nav` into `target`: every holder gets `factor` times as many units,
 * so each unit is worth `1/factor` of before and nobody's value changes.
 * Null when it cannot be computed or when nothing would change.
 */
export function splitFactor(nav: number, target: number = TARGET_NAV): number | null {
  if (!Number.isFinite(nav) || !Number.isFinite(target) || !(nav > 0) || !(target > 0)) return null
  const f = nav / target
  return Math.abs(f - 1) < 1e-9 ? null : f
}

/**
 * Re-denominates the whole ledger by `factor` (a unit split; factor < 1 is a reverse split):
 *  - opening units of every investor × factor (opening COST is money, unchanged),
 *  - every transaction: units × factor and nav ÷ factor, so `units = amount / nav` still holds.
 * Money amounts, dividends, fees, valuations and personal accounts are untouched, so every value,
 * profit and fee stays the same; only the unit counts and the NAV (past and future) are rescaled.
 * One database transaction: nothing changes if anything fails.
 */
export async function applyUnitSplit(factor: number) {
  if (!Number.isFinite(factor) || !(factor > 0)) throw new Error('ضریب تقسیم معتبر نیست.')
  return db.transaction(async (trx) => {
    const inv = await trx.from('investors').count('* as n').first()
    const tx = await trx.from('transactions').count('* as n').first()
    await trx.rawQuery('update investors set opening_units = opening_units * ?', [factor])
    await trx.rawQuery('update transactions set units = units * ?, nav = nav / ?', [factor, factor])
    return { investors: Number(inv?.n ?? 0), transactions: Number(tx?.n ?? 0) }
  })
}
