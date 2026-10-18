import Period from '#models/period'
import Investor from '#models/investor'
import Transaction from '#models/transaction'
import Dividend from '#models/dividend'
import PersonalAccount from '#models/personal_account'
import HistoryPeriod from '#models/history_period'
import Area from '#models/area'
import AreaEntry from '#models/area_entry'
import FeeReceipt from '#models/fee_receipt'
import Valuation from '#models/valuation'
import { baseline, type Val } from '#services/valuation'
import {
  fundSummary, fundAccount, personalAccount, replayPosition, ledgerIsValid,
  type PeriodParams, type Tx,
} from '#services/fund_calculator'

const N = (v: number | bigint) => Number(v)
const sumBy = <T extends { amount: number }>(l: T[]) => l.reduce((a, t) => a + t.amount, 0)

export interface LedgerTx extends Tx {
  id: number
  investorId: number
  nav: number
  occurredOn: string
  note: string | null
  batchId: string | null
  /** 'fee' = units issued to the manager as fee: units and the investor's capital change, but no cash enters the fund. */
  kind: 'normal' | 'fee'
}
export interface FeeRec {
  id: number
  scope: 'fund' | 'personal'
  investorId: number | null
  amount: number
  occurredOn: string
  method: 'record' | 'cash' | 'units' | 'settle'
  note: string | null
  txId: number | null
}
export interface AreaMove {
  id: number
  areaId: number
  investorId: number
  type: 'deposit' | 'withdraw'
  amount: number
  occurredOn: string
  note: string | null
  batchId: string
}
export interface Div {
  id: number
  scope: 'fund' | 'personal'
  investorId: number | null
  amount: number
  occurredOn: string
  note: string | null
}

export const byDate = (a: { occurredOn: string; id: number }, b: { occurredOn: string; id: number }) =>
  a.occurredOn.localeCompare(b.occurredOn) || a.id - b.id

/** Builds every period's report (fund + each investor) from the database. */
export async function loadState() {
  const periods = await Period.query().orderBy('start_on')
  const investors = await Investor.query().orderBy('id')
  const personals = await PersonalAccount.query()
  const history = await HistoryPeriod.query().orderBy('id')

  const txs: LedgerTx[] = (await Transaction.query())
    .map((t) => ({
      id: t.id, investorId: t.investorId, type: t.type as 'issue' | 'redeem', amount: N(t.amount),
      nav: t.nav, units: t.units, occurredOn: t.occurredOn, note: t.note, batchId: t.batchId,
      kind: (t.kind === 'fee' ? 'fee' : 'normal') as 'normal' | 'fee',
    }))
    .sort(byDate)
  const divs: Div[] = (await Dividend.query())
    .map((d) => ({
      id: d.id, scope: d.scope as 'fund' | 'personal', investorId: d.investorId,
      amount: N(d.amount), occurredOn: d.occurredOn, note: d.note,
    }))
    .sort(byDate)

  const valuations: (Val & { note: string | null })[] = (await Valuation.query())
    .map((v) => ({ id: v.id, occurredOn: v.occurredOn, marketValue: N(v.marketValue), kind: v.kind as Val['kind'], note: v.note }))
    .sort(byDate)
  const fees: FeeRec[] = (await FeeReceipt.query())
    .map((f) => ({
      id: f.id, scope: f.scope as 'fund' | 'personal', investorId: f.investorId, amount: N(f.amount),
      occurredOn: f.occurredOn, method: f.method as FeeRec['method'], note: f.note, txId: f.txId,
    }))
    .sort(byDate)
  const areaEntries: AreaMove[] = (await AreaEntry.query())
    .map((e) => ({
      id: e.id, areaId: e.areaId, investorId: e.investorId, type: e.type as 'deposit' | 'withdraw',
      amount: N(e.amount), occurredOn: e.occurredOn, note: e.note, batchId: e.batchId,
    }))
    .sort(byDate)
  const areas = (await Area.query().orderBy('id')).map((a) => {
    const entries = areaEntries.filter((e) => e.areaId === a.id)
    const rows = investors
      .map((inv) => {
        const mine = entries.filter((e) => e.investorId === inv.id)
        const deposits = sumBy(mine.filter((e) => e.type === 'deposit'))
        const withdrawals = sumBy(mine.filter((e) => e.type === 'withdraw'))
        return { investorId: inv.id, name: inv.name, deposits, withdrawals, balance: deposits - withdrawals, value: 0, profit: 0 }
      })
      .filter((r) => r.deposits || r.withdrawals)
    const totalBalance = rows.reduce((x, r) => x + r.balance, 0)
    const marketValue = N(a.marketValue)
    // With a valuation, the area's value is shared by balance; without one, value = balance.
    for (const r of rows) {
      r.value = marketValue > 0 && totalBalance > 0 ? (r.balance / totalBalance) * marketValue : r.balance
      r.profit = r.value - r.balance
    }
    return { id: a.id, name: a.name, kind: a.kind, notes: a.notes, marketValue, valuedOn: a.valuedOn, rows, totalBalance, entries }
  })

  const position = (inv: Investor, date: string) =>
    replayPosition(inv.openingUnits, inv.openingCost, txs.filter((t) => t.investorId === inv.id && t.occurredOn <= date))

  const reports: Report[] = []
  for (const period of periods) {
    const inRange = (d: string) => d >= period.startOn && d <= period.endOn
    const txIn = txs.filter((t) => inRange(t.occurredOn))
    const of = (l: LedgerTx[], type: string) => sumBy(l.filter((t) => t.type === type))
    const isOpen = period.status === 'open'
    // Fee-unit transactions bring no cash into the fund, so they are left out of deposits and market value.
    const cashTx = txIn.filter((t) => t.kind !== 'fee')
    const feesFund = fees.filter((f) => f.scope === 'fund' && inRange(f.occurredOn))
    const sumF = (l: FeeRec[], m: string) => sumBy(l.filter((f) => f.method === m))
    const feeCash = sumF(feesFund, 'cash')
    const feeUnitsAmt = sumF(feesFund, 'units')
    // Market value = latest valuation in the period + cash flows after that valuation date.
    const base = baseline(
      { startOn: period.startOn, endOn: period.endOn, marketValueBase: N(period.marketValueBase), valuationOn: period.valuationOn },
      valuations
    )
    const adjust = isOpen || base.source === 'ledger'
    const after = adjust ? cashTx.filter((t) => t.occurredOn > base.effDate) : []
    const cashAfter = adjust ? sumBy(feesFund.filter((f) => f.method === 'cash' && f.occurredOn > base.effDate)) : 0
    const marketValue = base.value + of(after, 'issue') - of(after, 'redeem') - cashAfter
    const fundDivs = divs.filter((d) => d.scope === 'fund' && inRange(d.occurredOn))
    const prev = reports[reports.length - 1]

    const pos = new Map(investors.map((i) => [i.id, position(i, period.endOn)]))
    const totalUnits = [...pos.values()].reduce((a, p) => a + p.units, 0)
    const params: PeriodParams = {
      months: period.months,
      beginMarket: N(period.beginMarket),
      deposits: N(period.openingDeposits) + of(cashTx, 'issue'),
      withdrawals: N(period.openingWithdrawals) + of(cashTx, 'redeem'),
      feePaidCash: feeCash,
      feeUnits: feeUnitsAmt,
      dividends: sumBy(fundDivs),
      marketValue,
      fixedRate: period.fixedRate, mgmtRate: period.mgmtRate, excessRate: period.excessRate,
      feeCap: period.feeCap, discount: N(period.discount),
      mgmtRate2: period.mgmtRate2, excessRate2: period.excessRate2,
    }
    const summary = fundSummary(params, totalUnits)

    const rows = investors.map((inv) => {
      const prevRow = prev?.rows.find((r) => r.id === inv.id)
      const mine = txIn.filter((t) => t.investorId === inv.id)
      let div = 0
      for (const d of fundDivs) {
        const tot = investors.reduce((a, i) => a + position(i, d.occurredOn).units, 0)
        if (tot > 0) div += (d.amount * position(inv, d.occurredOn).units) / tot
      }
      const p = pos.get(inv.id)!
      const fund = fundAccount(
        {
          unitsEnd: p.units,
          beginValue: prev && prevRow ? prevRow.unitsEnd * prev.summary.nav : 0,
          deposits: of(mine, 'issue') + (prev ? 0 : inv.openingCost),
          withdrawals: of(mine, 'redeem'),
          dividends: div,
        },
        summary, totalUnits, params
      )
      const pa = personals.find((x) => x.investorId === inv.id && x.periodId === period.id)
      const personalDiv = sumBy(divs.filter((d) => d.scope === 'personal' && d.investorId === inv.id && inRange(d.occurredOn)))
      const personalRaw = pa
        ? { beginValue: N(pa.beginValue), deposits: N(pa.deposits), withdrawals: N(pa.withdrawals), marketValue: N(pa.marketValue) }
        : null
      return {
        id: inv.id, name: inv.name, notes: inv.notes,
        unitsEnd: p.units, cost: p.cost,
        share: totalUnits > 0 ? (p.units / totalUnits) * 100 : 0,
        fund, fundDividends: div, personalDividends: personalDiv, personalRaw,
        personalFeeReceived: sumBy(fees.filter((f) => f.scope === 'personal' && f.investorId === inv.id && inRange(f.occurredOn))),
        personal: personalRaw ? personalAccount({ ...personalRaw, dividends: personalDiv }, params) : null,
      }
    })
    const fundFees = {
      accrued: summary.fee, cash: feeCash, units: feeUnitsAmt,
      recorded: sumF(feesFund, 'record') + sumF(feesFund, 'settle'),
      received: sumBy(feesFund), remaining: summary.feeRemaining,
    }
    reports.push({
      period, params, summary, totalUnits, rows, fees: fundFees,
      valuation: { open: N(period.beginMarket), latest: base.value, latestOn: base.effDate, source: base.source },
    })
  }

  const current = [...reports].reverse().find((r) => r.period.status === 'open') ?? reports[reports.length - 1]
  return { reports, current, investors, txs, divs, history, areas, areaEntries, fees, valuations }
}

export type Report = {
  period: Period
  params: PeriodParams
  summary: ReturnType<typeof fundSummary>
  totalUnits: number
  rows: {
    id: number; name: string; notes: string | null; unitsEnd: number; cost: number; share: number
    fund: ReturnType<typeof fundAccount>; fundDividends: number; personalDividends: number
    personalRaw: { beginValue: number; deposits: number; withdrawals: number; marketValue: number } | null
    personal: ReturnType<typeof personalAccount> | null
    personalFeeReceived: number
  }[]
  fees: { accrued: number; cash: number; units: number; recorded: number; received: number; remaining: number }
  valuation: { open: number; latest: number; latestOn: string; source: 'ledger' | 'legacy' }
}

export type State = Awaited<ReturnType<typeof loadState>>

/** Checks that a candidate list of transactions never drives a holding negative. */
export function ledgerOk(st: State, candidate: LedgerTx[]) {
  const opening = new Map(st.investors.map((i) => [i.id, i.openingUnits]))
  return ledgerIsValid(opening, [...candidate].sort(byDate))
}

/** True when no investor's balance in any area ever goes negative. */
export function areaLedgerOk(entries: AreaMove[]) {
  const bal = new Map<string, number>()
  for (const e of [...entries].sort(byDate)) {
    const k = `${e.areaId}:${e.investorId}`
    const v = (bal.get(k) ?? 0) + (e.type === 'deposit' ? e.amount : -e.amount)
    if (v < -0.5) return false
    bal.set(k, v)
  }
  return true
}
