import { and, desc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm'
import * as schema from './schema'
import type { Db, Executor } from './db'
import {
  TRANSACTION_TYPES, assertUnitsBalance, buildReversal, checkEntryAgainstAccount, parseNewEntry,
  unitsDeltaMicro, type NewEntry
} from '../core/ledger'
import { fromMicro } from '../core/money'
import { ValidationError, optInt, reqDate, reqEnum, reqInt, requireObject } from '../core/validation'

type TxRow = typeof schema.transactions.$inferSelect

/** API shape: units as a decimal number; the micro-unit integer stays internal. */
export function mapTx(row: TxRow) {
  const { unitsMicro, ...rest } = row
  return { ...rest, units: unitsMicro === null ? null : fromMicro(unitsMicro) }
}

const today = () => new Date().toISOString().slice(0, 10)

export function assertPeriodOpen(ex: Executor, date: string): void {
  const closed = ex.select().from(schema.fiscalPeriods)
    .where(and(eq(schema.fiscalPeriods.isClosed, true), lte(schema.fiscalPeriods.startDate, date), gte(schema.fiscalPeriods.endDate, date)))
    .get()
  if (closed) throw new ValidationError(`دوره مالی «${closed.name}» بسته شده و ثبت تراکنش در آن مجاز نیست`)
}

/** Unit balance, derived from the ledger (deposit +, withdraw −). There is no stored balance. */
export function unitsBalanceMicro(ex: Executor, accountId: number): number {
  const row = ex.select({
    total: sql<number>`COALESCE(SUM(CASE ${schema.transactions.type} WHEN 'deposit' THEN ${schema.transactions.unitsMicro} WHEN 'withdraw' THEN -${schema.transactions.unitsMicro} ELSE 0 END), 0)`
  }).from(schema.transactions)
    .where(and(eq(schema.transactions.accountId, accountId), isNotNull(schema.transactions.unitsMicro))).get()
  return row?.total ?? 0
}

/** Net invested capital: deposits − withdrawals (reversals net out automatically). */
export function costBasis(ex: Executor, accountId: number): number {
  const row = ex.select({
    total: sql<number>`COALESCE(SUM(CASE ${schema.transactions.type} WHEN 'deposit' THEN ${schema.transactions.amount} WHEN 'withdraw' THEN -${schema.transactions.amount} ELSE 0 END), 0)`
  }).from(schema.transactions).where(eq(schema.transactions.accountId, accountId)).get()
  return row?.total ?? 0
}

function insertEntry(ex: Executor, e: NewEntry) {
  return ex.insert(schema.transactions).values({
    accountId: e.accountId, type: e.type, amount: e.amount, unitsMicro: e.unitsMicro, date: e.date,
    description: e.description, relatedAssetId: e.relatedAssetId, relatedTransactionId: e.relatedTransactionId
  }).returning().get()
}

/** One database transaction: the ledger entry and every check succeed together, or nothing is written. */
export function createTransaction(db: Db, raw: unknown) {
  const entry = parseNewEntry(raw)
  return db.transaction((tx) => {
    const account = tx.select().from(schema.accounts).where(eq(schema.accounts.id, entry.accountId)).get()
    if (!account) throw new ValidationError('حساب یافت نشد')
    checkEntryAgainstAccount(entry, account)
    assertPeriodOpen(tx, entry.date)
    const delta = unitsDeltaMicro(entry.type, entry.unitsMicro)
    if (delta !== 0) assertUnitsBalance(unitsBalanceMicro(tx, entry.accountId), delta)
    return mapTx(insertEntry(tx, entry))
  })
}

export function reverseTransaction(db: Db, id: number, date: string = today()) {
  reqDate(date, 'تاریخ')
  return db.transaction((tx) => {
    const orig = tx.select().from(schema.transactions).where(eq(schema.transactions.id, id)).get()
    if (!orig) throw new ValidationError('تراکنش یافت نشد')
    const reversal = buildReversal(orig, date)

    const already = tx.select({ id: schema.transactions.id }).from(schema.transactions)
      .where(and(eq(schema.transactions.relatedTransactionId, id), sql`${schema.transactions.amount} < 0`)).get()
    if (already) throw new ValidationError('این تراکنش قبلاً برگشت خورده است')
    assertPeriodOpen(tx, date)
    const delta = unitsDeltaMicro(reversal.type, reversal.unitsMicro)
    if (delta !== 0) assertUnitsBalance(unitsBalanceMicro(tx, reversal.accountId), delta)
    return mapTx(insertEntry(tx, reversal))
  })
}

export function listTransactions(db: Db, raw?: unknown) {
  const f = raw == null ? {} : requireObject(raw, 'filters')
  const conditions = []
  const accountId = optInt(f.accountId, 'حساب')
  if (accountId != null) conditions.push(eq(schema.transactions.accountId, accountId))
  if (f.type != null && f.type !== '') conditions.push(eq(schema.transactions.type, reqEnum(f.type, TRANSACTION_TYPES, 'نوع')))
  if (f.fromDate != null) conditions.push(gte(schema.transactions.date, reqDate(f.fromDate, 'از تاریخ')))
  if (f.toDate != null) conditions.push(lte(schema.transactions.date, reqDate(f.toDate, 'تا تاریخ')))
  const limit = f.limit == null ? 500 : reqInt(f.limit, 'limit', 1, 5000)
  return db.select().from(schema.transactions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.transactions.date), desc(schema.transactions.id))
    .limit(limit).all().map(mapTx)
}

export function summarize(db: Db, accountId: number, fromDate: string, toDate: string) {
  const rows = db.select({ type: schema.transactions.type, total: sql<number>`SUM(${schema.transactions.amount})` })
    .from(schema.transactions)
    .where(and(eq(schema.transactions.accountId, accountId), gte(schema.transactions.date, fromDate), lte(schema.transactions.date, toDate)))
    .groupBy(schema.transactions.type).all()
  const s = { deposits: 0, withdrawals: 0, dividends: 0, fees: 0 }
  for (const r of rows) {
    if (r.type === 'deposit') s.deposits = r.total
    else if (r.type === 'withdraw') s.withdrawals = r.total
    else if (r.type === 'dividend') s.dividends = r.total
    else if (r.type === 'fee') s.fees = r.total
  }
  return s
}
