import { beforeEach, describe, expect, it } from 'vitest'
import * as schema from '../../data/schema'
import { createTransaction, summarize } from '../../data/ledgerRepo'
import { createValuation } from '../../data/accountRepo'
import { closePeriod, createPeriod, listSnapshots, previewClose } from '../../data/periodRepo'
import { freshDb } from './helpers'

let ctx: ReturnType<typeof freshDb>
let periodId: number
beforeEach(() => {
  ctx = freshDb()
  periodId = createPeriod(ctx.db, { name: '۱۴۰۵', startDate: '2026-01-01', endDate: '2026-12-31', months: 12 }).id
  createTransaction(ctx.db, { accountId: ctx.fund, type: 'deposit', amount: 1_000_000_000, units: 100, date: '2026-01-01' })
  createTransaction(ctx.db, { accountId: ctx.personal, type: 'deposit', amount: 500_000_000, date: '2026-01-01' })
  createValuation(ctx.db, { accountId: ctx.fund, date: '2026-12-31', marketValue: 1_300_000_000 })
})

describe('createPeriod', () => {
  it('rejects overlaps and reversed dates', () => {
    expect(() => createPeriod(ctx.db, { name: 'x', startDate: '2026-06-01', endDate: '2027-05-31', months: 12 })).toThrow(/همپوشانی/)
    expect(() => createPeriod(ctx.db, { name: 'x', startDate: '2028-02-01', endDate: '2028-01-01', months: 12 })).toThrow()
  })
})

describe('closing a period', () => {
  it('preview computes but writes nothing', () => {
    const p = previewClose(ctx.db, periodId)
    expect(p.accounts).toHaveLength(2)
    expect(ctx.db.select().from(schema.snapshots).all()).toHaveLength(0)
    expect(ctx.db.select().from(schema.fiscalPeriods).all()[0].isClosed).toBe(false)
  })

  it('writes snapshots, posts fee entries and closes — atomically', () => {
    const r = closePeriod(ctx.db, periodId)
    const snaps = listSnapshots(ctx.db, periodId)
    expect(snaps).toHaveLength(2)

    const fund = snaps.find((s) => s.accountId === ctx.fund)!
    expect(fund.costBasis).toBe(1_000_000_000)
    expect(fund.marketValue).toBe(1_300_000_000)
    expect(fund.marketValueSource).toBe('valuation')
    expect(fund.units).toBe(100)
    expect(fund.managerFee).toBe(30_000_000) // 10M fixed + 20M performance

    const personal = snaps.find((s) => s.accountId === ctx.personal)!
    expect(personal.marketValueSource).toBe('cost_basis')
    expect(personal.managerFee).toBe(5_000_000) // 1% fixed only

    expect(r.totalFee).toBe(35_000_000)
    expect(summarize(ctx.db, ctx.fund, '2026-01-01', '2026-12-31').fees).toBe(30_000_000)
    expect(ctx.db.select().from(schema.fiscalPeriods).all()[0].isClosed).toBe(true)
  })

  it('locks the period afterwards and cannot be closed twice', () => {
    closePeriod(ctx.db, periodId)
    expect(() => createTransaction(ctx.db, { accountId: ctx.fund, type: 'deposit', amount: 1, units: 1, date: '2026-06-01' })).toThrow(/بسته/)
    expect(() => closePeriod(ctx.db, periodId)).toThrow(/قبلاً/)
  })

  it('snapshots are immutable', () => {
    closePeriod(ctx.db, periodId)
    expect(() => ctx.sqlite.exec('UPDATE snapshots SET manager_fee = 0')).toThrow(/immutable/)
    expect(() => ctx.sqlite.exec('DELETE FROM snapshots')).toThrow(/immutable/)
  })
})
