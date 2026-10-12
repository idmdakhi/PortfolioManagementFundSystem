import { beforeEach, describe, expect, it } from 'vitest'
import * as schema from '../../data/schema'
import {
  costBasis, createTransaction, listTransactions, reverseTransaction, summarize, unitsBalanceMicro
} from '../../data/ledgerRepo'
import { freshDb } from './helpers'

let ctx: ReturnType<typeof freshDb>
beforeEach(() => { ctx = freshDb() })
const units = () => unitsBalanceMicro(ctx.db, ctx.fund)
const count = () => ctx.db.select().from(schema.transactions).all().length
const deposit = (extra: object = {}) =>
  createTransaction(ctx.db, { accountId: ctx.fund, type: 'deposit', amount: 1000, units: 10, date: '2026-03-01', ...extra })

describe('createTransaction', () => {
  it('stores integers and derives units from the ledger', () => {
    const t = deposit()
    expect(t.units).toBe(10)
    expect(units()).toBe(10_000_000)
    expect(costBasis(ctx.db, ctx.fund)).toBe(1000)
    expect(listTransactions(ctx.db)[0].units).toBe(10)
  })

  it('rolls back everything when a check fails (atomic)', () => {
    deposit()
    expect(() => createTransaction(ctx.db, { accountId: ctx.fund, type: 'withdraw', amount: 5000, units: 11, date: '2026-03-02' })).toThrow(/کافی نیست/)
    expect(count()).toBe(1)
    expect(units()).toBe(10_000_000)
  })

  it('withdraw reduces units; fund_share requires units', () => {
    deposit()
    createTransaction(ctx.db, { accountId: ctx.fund, type: 'withdraw', amount: 400, units: 4, date: '2026-03-02' })
    expect(units()).toBe(6_000_000)
    expect(costBasis(ctx.db, ctx.fund)).toBe(600)
    expect(() => deposit({ units: undefined })).toThrow(/واحد/)
  })

  it('rejects invalid input and non-integer rials', () => {
    for (const bad of [{ amount: 10.5 }, { amount: -5 }, { amount: NaN }, { type: 'bogus' }, { date: '2026-02-30' }, { accountId: 999 }]) {
      expect(() => deposit(bad)).toThrow()
    }
    expect(count()).toBe(0)
  })

  it('personal accounts and dividends do not need units', () => {
    createTransaction(ctx.db, { accountId: ctx.personal, type: 'deposit', amount: 500, date: '2026-03-01' })
    createTransaction(ctx.db, { accountId: ctx.fund, type: 'dividend', amount: 50, date: '2026-03-01' })
    expect(count()).toBe(2)
    expect(units()).toBe(0)
  })

  it('refuses entries inside a closed period', () => {
    ctx.db.insert(schema.fiscalPeriods).values({ name: 'P', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: true }).run()
    expect(() => deposit()).toThrow(/بسته/)
    expect(count()).toBe(0)
  })
})

describe('reverseTransaction', () => {
  it('adds a negating entry; original stays; sums net to zero', () => {
    const t = deposit()
    const rev = reverseTransaction(ctx.db, t.id, '2026-03-05')
    expect(rev).toMatchObject({ amount: -1000, units: -10, relatedTransactionId: t.id })
    expect(count()).toBe(2)
    expect(units()).toBe(0)
    expect(costBasis(ctx.db, ctx.fund)).toBe(0)
    expect(summarize(ctx.db, ctx.fund, '2026-01-01', '2026-12-31').deposits).toBe(0)
  })

  it('cannot reverse twice or reverse a reversal', () => {
    const t = deposit()
    const rev = reverseTransaction(ctx.db, t.id, '2026-03-05')
    expect(() => reverseTransaction(ctx.db, t.id, '2026-03-06')).toThrow(/قبلاً/)
    expect(() => reverseTransaction(ctx.db, rev.id, '2026-03-06')).toThrow(/برگشتی/)
  })

  it('refuses (changing nothing) if the units were already withdrawn', () => {
    const t = deposit()
    createTransaction(ctx.db, { accountId: ctx.fund, type: 'withdraw', amount: 900, units: 9, date: '2026-03-02' })
    expect(() => reverseTransaction(ctx.db, t.id, '2026-03-05')).toThrow(/کافی نیست/)
    expect(count()).toBe(2)
    expect(units()).toBe(1_000_000)
  })

  it('reversing a withdrawal gives the units back', () => {
    deposit()
    const w = createTransaction(ctx.db, { accountId: ctx.fund, type: 'withdraw', amount: 400, units: 4, date: '2026-03-02' })
    reverseTransaction(ctx.db, w.id, '2026-03-05')
    expect(units()).toBe(10_000_000)
  })
})
