import { and, eq, gte, lt, lte, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../database/schema'
import {
  ValidationError, optString, reqDate, reqEnum, reqInt, reqNumber, requireObject
} from './validation'

type Db = BetterSQLite3Database<typeof schema>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export const TRANSACTION_TYPES = ['deposit', 'withdraw', 'dividend', 'fee', 'transfer', 'asset_sale'] as const
/** Only these move fund units. */
const UNIT_TYPES = new Set<string>(['deposit', 'withdraw'])
const EPSILON = 1e-9

const today = () => new Date().toISOString().slice(0, 10)

function assertPeriodOpen(tx: Tx, date: string) {
  const closed = tx.select().from(schema.fiscalPeriods)
    .where(and(eq(schema.fiscalPeriods.isClosed, true), lte(schema.fiscalPeriods.startDate, date), gte(schema.fiscalPeriods.endDate, date)))
    .get()
  if (closed) throw new ValidationError(`دوره مالی «${closed.name}» بسته شده و ثبت تراکنش در آن مجاز نیست`)
}

/** Adds `delta` to the account's units; refuses to go below zero. Must run inside a transaction. */
function applyUnitsDelta(tx: Tx, accountId: number, delta: number) {
  const current = tx.select().from(schema.accountUnits).where(eq(schema.accountUnits.accountId, accountId)).get()
  const next = (current?.units ?? 0) + delta
  if (next < -EPSILON) throw new ValidationError('موجودی واحد‌های حساب برای این عملیات کافی نیست')
  const units = Math.max(0, next)
  if (current) {
    tx.update(schema.accountUnits).set({ units, updatedAt: new Date().toISOString() })
      .where(eq(schema.accountUnits.accountId, accountId)).run()
  } else {
    tx.insert(schema.accountUnits).values({ accountId, units }).run()
  }
}

/**
 * Records a ledger entry and (for deposit/withdraw with units) updates the unit balance —
 * all in ONE database transaction: either both happen or neither does.
 */
export function createTransaction(db: Db, raw: unknown) {
  const data = requireObject(raw)
  const accountId = reqInt(data.accountId, 'حساب')
  const type = reqEnum(data.type, TRANSACTION_TYPES, 'نوع تراکنش')
  const amount = reqNumber(data.amount, 'مبلغ', { positive: true })
  const date = reqDate(data.date, 'تاریخ')
  const units = data.units == null ? null : reqNumber(data.units, 'تعداد واحد', { positive: true })
  const description = optString(data.description, 'توضیحات')

  return db.transaction((tx) => {
    const account = tx.select().from(schema.accounts).where(eq(schema.accounts.id, accountId)).get()
    if (!account) throw new ValidationError('حساب یافت نشد')
    if (!account.isActive) throw new ValidationError('حساب غیرفعال است')
    assertPeriodOpen(tx, date)

    if (units !== null && !UNIT_TYPES.has(type)) throw new ValidationError('تعداد واحد فقط برای واریز و برداشت معتبر است')
    if (account.type === 'fund_share' && UNIT_TYPES.has(type) && units === null) {
      throw new ValidationError('برای حساب «سهم صندوق» تعداد واحد الزامی است')
    }

    const row = tx.insert(schema.transactions).values({
      accountId, type, amount, units, date, description,
      relatedAssetId: null, relatedTransactionId: null
    }).returning().get()

    if (units !== null) applyUnitsDelta(tx, accountId, type === 'deposit' ? units : -units)
    return row
  })
}

/**
 * Ledger entries are never deleted. A correction is a NEW entry with negated amount/units,
 * linked to the original via relatedTransactionId. Summaries (SUM) then net out naturally.
 */
export function reverseTransaction(db: Db, id: number, date: string = today()) {
  reqDate(date, 'تاریخ')
  return db.transaction((tx) => {
    const orig = tx.select().from(schema.transactions).where(eq(schema.transactions.id, id)).get()
    if (!orig) throw new ValidationError('تراکنش یافت نشد')
    if (orig.amount < 0) throw new ValidationError('تراکنش برگشتی را نمی‌توان دوباره برگشت زد')

    const already = tx.select({ id: schema.transactions.id }).from(schema.transactions)
      .where(and(eq(schema.transactions.relatedTransactionId, id), lt(schema.transactions.amount, 0))).get()
    if (already) throw new ValidationError('این تراکنش قبلاً برگشت خورده است')
    assertPeriodOpen(tx, date)

    const row = tx.insert(schema.transactions).values({
      accountId: orig.accountId, type: orig.type, amount: -orig.amount,
      units: orig.units == null ? null : -orig.units, date,
      description: `برگشت تراکنش #${id}`,
      relatedAssetId: orig.relatedAssetId, relatedTransactionId: id
    }).returning().get()

    if (orig.units != null && UNIT_TYPES.has(orig.type)) {
      applyUnitsDelta(tx, orig.accountId, (orig.type === 'deposit' ? 1 : -1) * -orig.units)
    }
    return row
  })
}

export function summarize(db: Db, accountId: number, fromDate: string, toDate: string) {
  const rows = db.select({ type: schema.transactions.type, total: sql<number>`SUM(${schema.transactions.amount})` })
    .from(schema.transactions)
    .where(and(eq(schema.transactions.accountId, accountId), gte(schema.transactions.date, fromDate), lte(schema.transactions.date, toDate)))
    .groupBy(schema.transactions.type).all()
  const summary = { deposits: 0, withdrawals: 0, dividends: 0, fees: 0 }
  for (const r of rows) {
    if (r.type === 'deposit') summary.deposits = r.total
    else if (r.type === 'withdraw') summary.withdrawals = r.total
    else if (r.type === 'dividend') summary.dividends = r.total
    else if (r.type === 'fee') summary.fees = r.total
  }
  return summary
}
