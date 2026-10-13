/**
 * Pure fund maths. No database, so every formula is unit-tested.
 * Money = whole rials (each line item is rounded). Units are doubles.
 *
 * Differences from the old workbook (deliberate):
 *  - cash dividends are counted ONCE in gross profit (workbook counted them twice);
 *  - an investor's fee share is subtracted ONCE (his value at NAV is already after fee);
 *  - fixed customer profit is an annual rate prorated by months/12 (equal for 12 months);
 *  - profit of a period is measured from the market value at the start of the period.
 */
const r = Math.round

export interface PeriodParams {
  months: number
  beginMarket: number // market value at the start of the period
  deposits: number
  withdrawals: number
  dividends: number // fund cash dividends received in the period
  marketValue: number // market value at the end of the period
  fixedRate: number // % per year, belongs to the customer
  mgmtRate: number // % fixed fee; charged as marketValue * rate / 12 per period (as the workbook)
  excessRate: number // % of excess profit, fund level
  feeCap: number // in units of 10,000,000 rials
  discount: number
  mgmtRate2: number // % per year of capital, personal accounts
  excessRate2: number // % of excess, personal accounts
}

export function fundSummary(p: PeriodParams, totalUnits: number) {
  const capital = p.beginMarket + p.deposits - p.withdrawals
  const gross = p.marketValue - capital + p.dividends
  const fixed = r((capital * p.fixedRate * p.months) / 1200)
  const excessBase = gross - fixed
  const mgmtFee = r((p.marketValue * p.mgmtRate) / 1200)
  const excessFee = Math.max(0, r((excessBase * p.excessRate) / 100))
  const raw = mgmtFee + excessFee - p.discount
  const fee = Math.max(0, Math.floor(Math.min(raw, p.feeCap * 1e7) / 1e5) * 1e5)
  const nav = totalUnits > 0 ? (p.marketValue - fee) / totalUnits : 0
  return {
    capital, gross, fixed, excessBase, mgmtFee, excessFee, fee, nav,
    marketValue: p.marketValue,
    profit: gross - fee,
    returnPct: capital > 0 ? (gross / capital) * 100 : 0,
  }
}
export type Summary = ReturnType<typeof fundSummary>

export interface FundHolding {
  unitsEnd: number
  beginValue: number
  deposits: number
  withdrawals: number
  dividends: number // investor's share of fund dividends
}

/** An investor's holding inside the fund, for one period. */
export function fundAccount(h: FundHolding, s: Summary, totalUnits: number, p: Pick<PeriodParams, 'fixedRate' | 'months'>) {
  const share = totalUnits > 0 ? h.unitsEnd / totalUnits : 0
  const marketShare = share * s.marketValue
  const feeShare = share * s.fee
  const value = h.unitsEnd * s.nav // = marketShare - feeShare
  const capital = h.beginValue + h.deposits - h.withdrawals
  const gross = marketShare - capital + h.dividends
  const fixed = r((capital * p.fixedRate * p.months) / 1200)
  return {
    value, marketShare, feeShare, capital, gross, fixed,
    excess: gross - fixed,
    net: gross - feeShare,
    returnPct: capital > 0 ? (gross / capital) * 100 : 0,
  }
}

export interface PersonalInput {
  beginValue: number
  deposits: number
  withdrawals: number
  marketValue: number
  dividends: number
}

/** An investor's personal account, per-investor sheet rules. */
export function personalAccount(a: PersonalInput, p: Pick<PeriodParams, 'fixedRate' | 'months' | 'mgmtRate2' | 'excessRate2' | 'feeCap'>) {
  const capital = a.beginValue + a.deposits - a.withdrawals
  const gross = a.marketValue - capital + a.dividends
  const fixed = r((capital * p.fixedRate * p.months) / 1200)
  const excess = gross - fixed
  const mgmtFee = r((capital * p.mgmtRate2 * p.months) / 1200)
  const excessFee = Math.max(0, r((excess * p.excessRate2) / 100))
  const fee = Math.min(mgmtFee + excessFee, p.feeCap * 1e7)
  return { capital, gross, fixed, excess, mgmtFee, excessFee, fee, net: gross - fee, returnPct: capital > 0 ? (gross / capital) * 100 : 0 }
}

export interface Tx { type: 'issue' | 'redeem'; amount: number; units: number }

/** Replays transactions (already sorted by date, id): issue adds cost, redeem removes cost at average. */
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

/** True when no investor ever holds negative units. `txs` sorted by (date, id). */
export function ledgerIsValid(opening: Map<number, number>, txs: (Tx & { investorId: number })[]) {
  const units = new Map(opening)
  for (const t of txs) {
    const u = (units.get(t.investorId) ?? 0) + (t.type === 'issue' ? t.units : -t.units)
    if (u < -1e-6) return false
    units.set(t.investorId, u)
  }
  return true
}
