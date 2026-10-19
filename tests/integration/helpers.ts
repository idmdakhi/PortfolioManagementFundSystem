import db from '@adonisjs/lucid/services/db'
import Period from '#models/period'
import Investor from '#models/investor'
import Transaction from '#models/transaction'
import Valuation from '#models/valuation'
import { invalidateOptions } from '#services/options'

const DATA_TABLES = [
  'audit_logs', 'fee_receipts', 'movements', 'area_entries', 'areas', 'dividends', 'transactions',
  'personal_accounts', 'valuations', 'history_periods', 'investors', 'periods',
]

/** Empties all business data (keeps users and the option rows the migrations seeded) and the settings. */
export async function resetData() {
  for (const t of DATA_TABLES) await db.from(t).delete()
  await db.from('options').where('list', 'setting').where('value', 'allow_closed_edit').delete()
  invalidateOptions()
}

const rates = { fixedRate: 20, mgmtRate: 1, excessRate: 10, feeCap: 100, discount: 0, mgmtRate2: 1, excessRate2: 20 }

/** One open period (2026-03-21..2027-03-20) valued at `value`, plus investors with the given opening units. */
export async function seedFund(value: number, holders: [string, number][]) {
  const period = await Period.create({
    label: 'T1', startOn: '2026-03-21', endOn: '2027-03-20', status: 'open', months: 12,
    beginMarket: value, openingDeposits: 0, openingWithdrawals: 0, marketValueBase: value, valuationOn: '2026-03-21', ...rates,
  })
  await Valuation.create({ occurredOn: '2026-03-21', marketValue: value, kind: 'open', note: 'open' })
  const investors: Investor[] = []
  for (const [name, units] of holders) investors.push(await Investor.create({ name, openingUnits: units, openingCost: units * 1000 }))
  return { period, investors }
}

export const issue = (investorId: number, amount: number, nav: number, occurredOn = '2026-04-01', extra: Partial<Transaction> = {}) =>
  Transaction.create({ investorId, type: 'issue', amount, nav, units: amount / nav, occurredOn, ...extra })
