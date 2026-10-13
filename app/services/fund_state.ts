import Period from '#models/period'
import Investor from '#models/investor'
import Transaction from '#models/transaction'
import { fundSummary, fundAccount, personalAccount, replayPosition, type PeriodParams } from '#services/fund_calculator'

/** Builds the full, derived state of the current period from the database. */
export async function loadState() {
  const period = await Period.query().orderBy('id', 'desc').firstOrFail()
  const investors = await Investor.query().preload('personal').orderBy('id')
  const N = (v: number | bigint) => Number(v)
  const txs = (await Transaction.query().orderBy('id')).map((t) => ({
    id: t.id,
    investorId: t.investorId,
    type: t.type as 'issue' | 'redeem',
    amount: N(t.amount),
    nav: t.nav,
    units: t.units,
    occurredOn: t.occurredOn,
    note: t.note,
  }))

  const sum = (type: string, from = 0) =>
    txs.filter((t) => t.type === type && t.id > from).reduce((a, t) => a + t.amount, 0)

  const params: PeriodParams = {
    months: period.months,
    beginCost: N(period.beginCost),
    deposits: N(period.openingDeposits) + sum('issue'),
    withdrawals: N(period.openingWithdrawals) + sum('redeem'),
    dividends: N(period.dividends),
    marketValue: N(period.marketValueBase) + sum('issue', period.valuationTxId) - sum('redeem', period.valuationTxId),
    fixedRate: period.fixedRate,
    mgmtRate: period.mgmtRate,
    excessRate: period.excessRate,
    feeCap: period.feeCap,
    discount: N(period.discount),
    mgmtRate2: period.mgmtRate2,
    excessRate2: period.excessRate2,
  }

  const positions = investors.map((inv) => ({
    inv,
    ...replayPosition(inv.openingUnits, inv.openingCost, txs.filter((t) => t.investorId === inv.id)),
  }))
  const totalUnits = positions.reduce((a, p) => a + p.units, 0)
  const summary = fundSummary(params, totalUnits)

  const rows = positions.map((p) => ({
    id: p.inv.id,
    name: p.inv.name,
    notes: p.inv.notes,
    units: p.units,
    cost: p.cost,
    share: totalUnits > 0 ? (p.units / totalUnits) * 100 : 0,
    fund: fundAccount(p.units, p.cost, summary, totalUnits, params.fixedRate),
    personalRaw: p.inv.personal ?? null,
    personal: p.inv.personal ? personalAccount({ endCost: N(p.inv.personal.endCost), marketValue: N(p.inv.personal.marketValue) }, params) : null,
  }))

  const lastTxId = txs.length ? txs[txs.length - 1].id : 0
  return { period, params, summary, totalUnits, rows, txs, lastTxId, investors }
}
