import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import * as schema from './schema'
import type { Db, Executor } from './db'
import { latestValuation } from './accountRepo'
import { readCalculationSettings } from './settingsRepo'
import { buildAccountSnapshot, type AccountSnapshot } from '../core/snapshot'
import { fromMicro } from '../core/money'
import { ValidationError, optString, reqDate, reqInt, reqString, requireObject } from '../core/validation'

type Period = typeof schema.fiscalPeriods.$inferSelect

export function createPeriod(db: Db, raw: unknown) {
  const data = requireObject(raw)
  const name = reqString(data.name, 'نام دوره')
  const startDate = reqDate(data.startDate, 'تاریخ شروع')
  const endDate = reqDate(data.endDate, 'تاریخ پایان')
  const months = reqInt(data.months, 'تعداد ماه', 1, 120)
  if (startDate > endDate) throw new ValidationError('تاریخ شروع باید قبل از تاریخ پایان باشد')
  return db.transaction((tx) => {
    // Overlap: existing.start <= newEnd AND existing.end >= newStart
    const overlap = tx.select().from(schema.fiscalPeriods)
      .where(and(lte(schema.fiscalPeriods.startDate, endDate), gte(schema.fiscalPeriods.endDate, startDate))).get()
    if (overlap) throw new ValidationError(`با دوره «${overlap.name}» همپوشانی دارد`)
    return tx.insert(schema.fiscalPeriods).values({ name, startDate, endDate, months, notes: optString(data.notes, 'توضیحات') })
      .returning().get()
  })
}

export interface AccountClosing {
  accountId: number
  accountName: string
  investorName: string
  snapshot: AccountSnapshot
}

/** Computes every active account's snapshot for the period from the ledger. Writes nothing. */
export function computeClosing(ex: Executor, period: Period): AccountClosing[] {
  const settings = readCalculationSettings(ex)
  const accounts = ex.select({ id: schema.accounts.id, name: schema.accounts.name, investor: schema.investors.name })
    .from(schema.accounts).innerJoin(schema.investors, eq(schema.investors.id, schema.accounts.investorId))
    .where(eq(schema.accounts.isActive, true)).orderBy(asc(schema.accounts.id)).all()

  const out: AccountClosing[] = []
  for (const a of accounts) {
    const rows = ex.select({
      type: schema.transactions.type, amount: schema.transactions.amount,
      unitsMicro: schema.transactions.unitsMicro, date: schema.transactions.date
    }).from(schema.transactions)
      .where(and(eq(schema.transactions.accountId, a.id), lte(schema.transactions.date, period.endDate))).all()
    if (rows.length === 0) continue
    const mv = latestValuation(ex, a.id, period.endDate)?.marketValue ?? null
    out.push({ accountId: a.id, accountName: a.name, investorName: a.investor, snapshot: buildAccountSnapshot(rows, period, mv, settings) })
  }
  return out
}

function loadPeriod(ex: Executor, id: number): Period {
  const period = ex.select().from(schema.fiscalPeriods).where(eq(schema.fiscalPeriods.id, id)).get()
  if (!period) throw new ValidationError('دوره یافت نشد')
  return period
}

export function previewClose(db: Db, id: unknown) {
  const period = loadPeriod(db, reqInt(id, 'دوره'))
  if (period.isClosed) throw new ValidationError('این دوره قبلاً بسته شده است')
  const accounts = computeClosing(db, period)
  return { period, accounts, totalFee: accounts.reduce((s, a) => s + a.snapshot.fee, 0) }
}

/**
 * Closes a period in ONE database transaction:
 *   1. snapshot every active account (immutable rows),
 *   2. post each manager fee as a `fee` ledger entry dated the period end,
 *   3. flag the period closed (from then on the database rejects entries inside it).
 */
export function closePeriod(db: Db, id: unknown) {
  const periodId = reqInt(id, 'دوره')
  return db.transaction((tx) => {
    const period = loadPeriod(tx, periodId)
    if (period.isClosed) throw new ValidationError('این دوره قبلاً بسته شده است')
    const accounts = computeClosing(tx, period)
    for (const a of accounts) {
      const s = a.snapshot
      tx.insert(schema.snapshots).values({
        periodId, accountId: a.accountId, costBasis: s.costBasis, averageCapital: s.averageCapital,
        marketValue: s.marketValue, marketValueSource: s.marketValueSource, dividends: s.dividends,
        grossProfit: s.grossProfit, guaranteedProfit: s.guaranteedProfit, managerFee: s.fee,
        returnPercent: s.returnPercent, unitsMicro: s.unitsMicro
      }).run()
      if (s.fee > 0) {
        tx.insert(schema.transactions).values({
          accountId: a.accountId, type: 'fee', amount: s.fee, unitsMicro: null, date: period.endDate,
          description: `کارمزد دوره «${period.name}»`, relatedAssetId: null, relatedTransactionId: null
        }).run()
      }
    }
    const closed = tx.update(schema.fiscalPeriods).set({ isClosed: true })
      .where(eq(schema.fiscalPeriods.id, periodId)).returning().get()
    return { period: closed, accounts, totalFee: accounts.reduce((s, a) => s + a.snapshot.fee, 0) }
  })
}

export function listSnapshots(db: Db, periodId: unknown) {
  return db.select({
    id: schema.snapshots.id, accountId: schema.snapshots.accountId, accountName: schema.accounts.name,
    investorName: schema.investors.name, costBasis: schema.snapshots.costBasis,
    averageCapital: schema.snapshots.averageCapital, marketValue: schema.snapshots.marketValue,
    marketValueSource: schema.snapshots.marketValueSource, dividends: schema.snapshots.dividends,
    grossProfit: schema.snapshots.grossProfit, guaranteedProfit: schema.snapshots.guaranteedProfit,
    managerFee: schema.snapshots.managerFee, returnPercent: schema.snapshots.returnPercent,
    unitsMicro: schema.snapshots.unitsMicro
  }).from(schema.snapshots)
    .innerJoin(schema.accounts, eq(schema.accounts.id, schema.snapshots.accountId))
    .innerJoin(schema.investors, eq(schema.investors.id, schema.accounts.investorId))
    .where(eq(schema.snapshots.periodId, reqInt(periodId, 'دوره')))
    .orderBy(asc(schema.snapshots.id)).all()
    .map(({ unitsMicro, ...r }) => ({ ...r, units: fromMicro(unitsMicro) }))
}

export function currentPeriod(db: Db) {
  return db.select().from(schema.fiscalPeriods).where(eq(schema.fiscalPeriods.isClosed, false))
    .orderBy(desc(schema.fiscalPeriods.startDate)).get()
}
