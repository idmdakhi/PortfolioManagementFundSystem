import { beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import * as schema from '../database/schema'
import { MIGRATIONS, runMigrations, seedDefaultSettings } from '../database/bootstrap'
import { createTransaction, reverseTransaction, summarize } from '../electron/services/ledger'

let sqlite: Database.Database
let db: ReturnType<typeof drizzle<typeof schema>>
let fundAccount: number
let personalAccount: number

const units = (id: number) => db.select().from(schema.accountUnits).where(eq(schema.accountUnits.accountId, id)).get()?.units ?? 0
const txCount = () => db.select().from(schema.transactions).all().length
const deposit = (extra: object = {}) =>
  createTransaction(db, { accountId: fundAccount, type: 'deposit', amount: 1000, units: 10, date: '2026-03-01', ...extra })

beforeEach(() => {
  sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  runMigrations(sqlite)
  db = drizzle(sqlite, { schema })
  const inv = db.insert(schema.investors).values({ name: 'تست' }).returning().get()
  fundAccount = db.insert(schema.accounts).values({ investorId: inv.id, name: 'صندوق', type: 'fund_share' }).returning().get().id
  personalAccount = db.insert(schema.accounts).values({ investorId: inv.id, name: 'شخصی', type: 'personal' }).returning().get().id
})

describe('migrations', () => {
  it('are idempotent and set user_version', () => {
    runMigrations(sqlite); runMigrations(sqlite)
    expect(sqlite.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length)
    seedDefaultSettings(sqlite); seedDefaultSettings(sqlite)
    expect(db.select().from(schema.settings).all().length).toBeGreaterThan(5)
  })
  it('upgrade a legacy database created before versioning', () => {
    const legacy = new Database(':memory:')
    legacy.exec(MIGRATIONS[0]) // as the old init-db.ts did: tables exist, user_version = 0
    expect(runMigrations(legacy)).toBe(MIGRATIONS.length)
    expect(legacy.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length)
  })
})

describe('createTransaction', () => {
  it('records the entry and updates units together', () => {
    deposit()
    expect(txCount()).toBe(1)
    expect(units(fundAccount)).toBe(10)
  })

  it('requires units for fund_share deposits/withdrawals', () => {
    expect(() => deposit({ units: undefined })).toThrow(/واحد/)
    expect(txCount()).toBe(0)
  })

  it('does not need units for personal accounts or dividends', () => {
    createTransaction(db, { accountId: personalAccount, type: 'deposit', amount: 500, date: '2026-03-01' })
    createTransaction(db, { accountId: fundAccount, type: 'dividend', amount: 50, date: '2026-03-01' })
    expect(txCount()).toBe(2)
  })

  it('rolls back the ledger row when units would go negative (atomicity)', () => {
    deposit()
    expect(() => createTransaction(db, { accountId: fundAccount, type: 'withdraw', amount: 5000, units: 11, date: '2026-03-02' }))
      .toThrow(/کافی نیست/)
    expect(txCount()).toBe(1)
    expect(units(fundAccount)).toBe(10)
  })

  it('withdraw reduces units', () => {
    deposit()
    createTransaction(db, { accountId: fundAccount, type: 'withdraw', amount: 400, units: 4, date: '2026-03-02' })
    expect(units(fundAccount)).toBe(6)
  })

  it('validates input', () => {
    expect(() => deposit({ amount: -5 })).toThrow()
    expect(() => deposit({ amount: Number.NaN })).toThrow()
    expect(() => deposit({ type: 'bogus' })).toThrow()
    expect(() => deposit({ date: '2026-02-30' })).toThrow()
    expect(() => deposit({ accountId: 999 })).toThrow(/یافت نشد/)
    expect(txCount()).toBe(0)
  })

  it('rejects entries inside a closed fiscal period', () => {
    db.insert(schema.fiscalPeriods).values({ name: '۱۴۰۴', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: true }).run()
    expect(() => deposit()).toThrow(/بسته/)
    expect(txCount()).toBe(0)
  })
})

describe('reverseTransaction', () => {
  it('negates the entry and restores units; summaries net to zero', () => {
    const t = deposit()
    const rev = reverseTransaction(db, t.id, '2026-03-05')
    expect(rev.amount).toBe(-1000)
    expect(rev.units).toBe(-10)
    expect(rev.relatedTransactionId).toBe(t.id)
    expect(units(fundAccount)).toBe(0)
    expect(txCount()).toBe(2) // original is kept
    expect(summarize(db, fundAccount, '2026-01-01', '2026-12-31').deposits).toBe(0)
  })

  it('cannot reverse twice, or reverse a reversal', () => {
    const t = deposit()
    const rev = reverseTransaction(db, t.id, '2026-03-05')
    expect(() => reverseTransaction(db, t.id, '2026-03-06')).toThrow(/قبلاً/)
    expect(() => reverseTransaction(db, rev.id, '2026-03-06')).toThrow(/برگشتی/)
  })

  it('refuses (and changes nothing) if the units were already withdrawn', () => {
    const t = deposit()
    createTransaction(db, { accountId: fundAccount, type: 'withdraw', amount: 900, units: 9, date: '2026-03-02' })
    expect(() => reverseTransaction(db, t.id, '2026-03-05')).toThrow(/کافی نیست/)
    expect(txCount()).toBe(2)
    expect(units(fundAccount)).toBe(1)
  })

  it('reversing a withdrawal gives the units back', () => {
    deposit()
    const w = createTransaction(db, { accountId: fundAccount, type: 'withdraw', amount: 400, units: 4, date: '2026-03-02' })
    reverseTransaction(db, w.id, '2026-03-05')
    expect(units(fundAccount)).toBe(10)
  })
})
