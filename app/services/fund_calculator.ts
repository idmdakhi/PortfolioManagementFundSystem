/**
 * Pure fund maths, ported 1:1 from the Excel workbook (sheet "صندوق سبدگردان").
 * No database access here, so it can be unit-tested with the workbook's own numbers.
 * Money = whole rials. Units are doubles, as in the workbook.
 */
export interface PeriodParams {
  months: number
  beginCost: number
  deposits: number
  withdrawals: number
  dividends: number
  marketValue: number
  fixedRate: number // % per year, belongs to the customer
  mgmtRate: number // % per year, fund-level fixed fee (on market value / months)
  excessRate: number // % of excess profit, fund-level
  feeCap: number // in units of 10,000,000 rials
  discount: number
  mgmtRate2: number // % of cost, personal statements
  excessRate2: number // % of excess, personal statements
}

export function fundSummary(p: PeriodParams, totalUnits: number) {
  const endCost = p.beginCost + p.deposits - p.withdrawals
  // Workbook quirk kept on purpose: dividends are counted twice (M8 = K8 + N9 - I8 + E9).
  const gross = p.marketValue + p.dividends - endCost + p.dividends
  const fixed = (endCost * p.fixedRate) / 100
  const excessBase = gross - fixed
  const mgmtFee = (p.marketValue * (p.mgmtRate / 100)) / p.months
  const excessFee = Math.max(0, (excessBase * p.excessRate) / 100)
  const raw = mgmtFee + excessFee - p.discount
  const fee = Math.floor(Math.min(raw, p.feeCap * 1e7) / 1e5) * 1e5
  const nav = totalUnits > 0 ? (p.marketValue - fee) / totalUnits : 0
  return { endCost, gross, fixed, excessBase, mgmtFee, excessFee, fee, nav, fundProfit: gross - fee }
}

export type Summary = ReturnType<typeof fundSummary>

/** An investor's holding inside the fund. */
export function fundAccount(units: number, cost: number, s: Summary, totalUnits: number, rate: number) {
  const value = units * s.nav
  const gross = value - cost
  const fixed = (cost * rate) / 100
  const excess = gross - fixed
  const fee = totalUnits > 0 ? (s.fee * units) / totalUnits : 0
  return { value, gross, fixed, excess, fee, net: gross - fee }
}

export interface PersonalAcc { endCost: number; marketValue: number }

/** An investor's personal account, using the per-investor sheet rules. */
export function personalAccount(a: PersonalAcc, p: Pick<PeriodParams, 'fixedRate' | 'mgmtRate2' | 'excessRate2' | 'feeCap'>) {
  const gross = a.marketValue - a.endCost
  const fixed = (a.endCost * p.fixedRate) / 100
  const excess = gross - fixed
  const mgmtFee = (a.endCost * p.mgmtRate2) / 100
  const excessFee = Math.max(0, (excess * p.excessRate2) / 100)
  const fee = Math.min(mgmtFee + excessFee, p.feeCap * 1e7)
  return { gross, fixed, excess, mgmtFee, excessFee, fee, net: gross - fee }
}

export interface Tx { type: 'issue' | 'redeem'; amount: number; units: number }

/** Replays transactions in order: issue adds cost, redeem removes cost at average. */
export function replayPosition(openingUnits: number, openingCost: number, txs: Tx[]) {
  let units = openingUnits
  let cost = openingCost
  for (const t of txs) {
    if (t.type === 'issue') {
      units += t.units
      cost += t.amount
    } else {
      cost -= units > 0 ? (cost * t.units) / units : 0
      units -= t.units
    }
  }
  return { units, cost }
}
