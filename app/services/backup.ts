import User from '#models/user'
import Period from '#models/period'
import Investor from '#models/investor'
import Transaction from '#models/transaction'
import PersonalAccount from '#models/personal_account'
import Dividend from '#models/dividend'
import HistoryPeriod from '#models/history_period'
import Area from '#models/area'
import AreaEntry from '#models/area_entry'
import PeriodSnapshot from '#models/period_snapshot'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

const VERSION = 1

/** Convert model row to plain JSON-safe object (bigint→number, DateTime→ISO). */
function serialize(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'bigint') out[k] = Number(v)
    else if (v instanceof DateTime) out[k] = v.toISO()
    else if (v && typeof v === 'object' && 'toISO' in (v as object)) out[k] = (v as DateTime).toISO()
    else out[k] = v
  }
  return out
}

export type BackupPayload = {
  version: number
  exportedAt: string
  tables: {
    users: Record<string, unknown>[]
    periods: Record<string, unknown>[]
    investors: Record<string, unknown>[]
    transactions: Record<string, unknown>[]
    personal_accounts: Record<string, unknown>[]
    dividends: Record<string, unknown>[]
    history_periods: Record<string, unknown>[]
    areas: Record<string, unknown>[]
    area_entries: Record<string, unknown>[]
    period_snapshots: Record<string, unknown>[]
  }
}

/** Export all application data to a JSON-serializable object. */
export async function exportBackup(): Promise<BackupPayload> {
  const [
    users,
    periods,
    investors,
    transactions,
    personalAccounts,
    dividends,
    historyPeriods,
    areas,
    areaEntries,
    periodSnapshots,
  ] = await Promise.all([
    User.query().orderBy('id'),
    Period.query().orderBy('id'),
    Investor.query().orderBy('id'),
    Transaction.query().orderBy('id'),
    PersonalAccount.query().orderBy('id'),
    Dividend.query().orderBy('id'),
    HistoryPeriod.query().orderBy('id'),
    Area.query().orderBy('id'),
    AreaEntry.query().orderBy('id'),
    PeriodSnapshot.query().orderBy('id'),
  ])

  return {
    version: VERSION,
    exportedAt: new Date().toISOString(),
    tables: {
      users: users.map((u) => {
        const s = serialize(u.serialize())
        // keep hashed password for full restore capability
        s.password = u.password
        return s
      }),
      periods: periods.map((r) => serialize(r.serialize())),
      investors: investors.map((r) => serialize(r.serialize())),
      transactions: transactions.map((r) => serialize(r.serialize())),
      personal_accounts: personalAccounts.map((r) => serialize(r.serialize())),
      dividends: dividends.map((r) => serialize(r.serialize())),
      history_periods: historyPeriods.map((r) => serialize(r.serialize())),
      areas: areas.map((r) => serialize(r.serialize())),
      area_entries: areaEntries.map((r) => serialize(r.serialize())),
      period_snapshots: periodSnapshots.map((r) => serialize(r.serialize())),
    },
  }
}

/** Restore from a previously exported JSON payload. Replaces all data. */
export async function importBackup(payload: BackupPayload): Promise<void> {
  if (!payload || payload.version !== VERSION || !payload.tables) {
    throw new Error('فایل پشتیبان نامعتبر یا نسخهٔ ناسازگار است.')
  }

  const t = payload.tables
  const tables = [
    'area_entries',
    'areas',
    'period_snapshots',
    'history_periods',
    'dividends',
    'personal_accounts',
    'transactions',
    'investors',
    'periods',
    'users',
  ] as const

  await db.transaction(async (trx) => {
    // Disable FK checks for SQLite while wiping
    await trx.rawQuery('PRAGMA foreign_keys = OFF')

    for (const name of tables) {
      await trx.table(name).delete()
    }

    // Insert in dependency order
    if (t.users?.length) {
      for (const row of t.users) {
        await trx.table('users').insert(normalizeRow(row, ['createdAt', 'updatedAt']))
      }
    }
    if (t.periods?.length) {
      for (const row of t.periods) {
        await trx.table('periods').insert(normalizeRow(row, ['createdAt', 'updatedAt']))
      }
    }
    if (t.investors?.length) {
      for (const row of t.investors) {
        await trx.table('investors').insert(normalizeRow(row, ['createdAt', 'updatedAt']))
      }
    }
    if (t.transactions?.length) {
      for (const row of t.transactions) {
        await trx.table('transactions').insert(
          normalizeRow(row, ['createdAt', 'updatedAt', 'editedAt'])
        )
      }
    }
    if (t.personal_accounts?.length) {
      for (const row of t.personal_accounts) {
        await trx.table('personal_accounts').insert(normalizeRow(row, []))
      }
    }
    if (t.dividends?.length) {
      for (const row of t.dividends) {
        await trx.table('dividends').insert(normalizeRow(row, ['createdAt', 'updatedAt']))
      }
    }
    if (t.history_periods?.length) {
      for (const row of t.history_periods) {
        await trx.table('history_periods').insert(normalizeRow(row, []))
      }
    }
    if (t.areas?.length) {
      for (const row of t.areas) {
        await trx.table('areas').insert(normalizeRow(row, ['createdAt', 'updatedAt']))
      }
    }
    if (t.area_entries?.length) {
      for (const row of t.area_entries) {
        await trx.table('area_entries').insert(normalizeRow(row, ['createdAt']))
      }
    }
    if (t.period_snapshots?.length) {
      for (const row of t.period_snapshots) {
        await trx.table('period_snapshots').insert(normalizeRow(row, ['createdAt']))
      }
    }

    await trx.rawQuery('PRAGMA foreign_keys = ON')
  })
}

/** Map camelCase model keys to snake_case DB columns and convert dates. */
function normalizeRow(row: Record<string, unknown>, dateKeys: string[]): Record<string, unknown> {
  const map: Record<string, string> = {
    fullName: 'full_name',
    investorId: 'investor_id',
    periodId: 'period_id',
    areaId: 'area_id',
    batchId: 'batch_id',
    createdBy: 'created_by',
    isDeleted: 'is_deleted',
    editedBy: 'edited_by',
    editedAt: 'edited_at',
    reversesId: 'reverses_id',
    editNote: 'edit_note',
    beginMarket: 'begin_market',
    openingDeposits: 'opening_deposits',
    openingWithdrawals: 'opening_withdrawals',
    marketValueBase: 'market_value_base',
    valuationOn: 'valuation_on',
    fixedRate: 'fixed_rate',
    mgmtRate: 'mgmt_rate',
    excessRate: 'excess_rate',
    feeCap: 'fee_cap',
    mgmtRate2: 'mgmt_rate_2',
    excessRate2: 'excess_rate_2',
    startOn: 'start_on',
    endOn: 'end_on',
    openingUnits: 'opening_units',
    openingCost: 'opening_cost',
    beginValue: 'begin_value',
    marketValue: 'market_value',
    returnPct: 'return_pct',
    valuedOn: 'valued_on',
    endJalali: 'end_jalali',
    totalUnits: 'total_units',
    totalCost: 'total_cost',
    beginCost: 'begin_cost',
    grossProfit: 'gross_profit',
    fixedProfit: 'fixed_profit',
    excessProfit: 'excess_profit',
    mgmtFee: 'mgmt_fee',
    excessFee: 'excess_fee',
    totalFee: 'total_fee',
    fundProfit: 'fund_profit',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    occurredOn: 'occurred_on',
  }

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    const col = map[k] ?? k
    if (dateKeys.includes(k) || col.endsWith('_at')) {
      out[col] = v ? String(v).replace('T', ' ').replace(/\.\d+Z?$/, '') : null
    } else {
      out[col] = v
    }
  }
  return out
}
