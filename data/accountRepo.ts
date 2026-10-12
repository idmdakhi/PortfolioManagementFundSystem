import { and, desc, eq, lte } from 'drizzle-orm'
import * as schema from './schema'
import type { Db, Executor } from './db'
import { costBasis, unitsBalanceMicro } from './ledgerRepo'
import { fromMicro } from '../core/money'
import {
  ValidationError, optInt, optString, pickAllowed, reqBool, reqDate, reqEnum, reqInt, reqRial, reqString, requireObject
} from '../core/validation'
import { ACCOUNT_TYPES } from '../core/ledger'

export function latestValuation(ex: Executor, accountId: number, onOrBefore?: string) {
  const conds = [eq(schema.valuations.accountId, accountId)]
  if (onOrBefore) conds.push(lte(schema.valuations.date, onOrBefore))
  return ex.select().from(schema.valuations).where(and(...conds))
    .orderBy(desc(schema.valuations.date), desc(schema.valuations.id)).get()
}

/** Accounts with derived figures (units / cost basis / latest valuation are computed from the ledger). */
export function listAccountsWithBalances(db: Db, investorId: number) {
  return db.select().from(schema.accounts).where(eq(schema.accounts.investorId, investorId)).all().map((a) => ({
    ...a,
    units: fromMicro(unitsBalanceMicro(db, a.id)),
    costBasis: costBasis(db, a.id),
    marketValue: latestValuation(db, a.id)?.marketValue ?? null
  }))
}

export function createAccount(db: Db, raw: unknown) {
  const data = requireObject(raw)
  const investorId = reqInt(data.investorId, 'سرمایه‌گذار')
  const name = reqString(data.name, 'نام حساب')
  const type = reqEnum(data.type, ACCOUNT_TYPES, 'نوع حساب')
  const parentAccountId = optInt(data.parentAccountId, 'حساب والد')
  const notes = optString(data.notes, 'توضیحات')
  return db.transaction((tx) => {
    if (!tx.select().from(schema.investors).where(eq(schema.investors.id, investorId)).get()) throw new ValidationError('سرمایه‌گذار یافت نشد')
    if (parentAccountId != null) {
      const parent = tx.select().from(schema.accounts).where(eq(schema.accounts.id, parentAccountId)).get()
      if (!parent || parent.investorId !== investorId) throw new ValidationError('حساب والد نامعتبر است')
    }
    return tx.insert(schema.accounts).values({ investorId, name, type, parentAccountId, notes }).returning().get()
  })
}

/** investorId and type are immutable after creation. */
export function updateAccount(db: Db, id: unknown, raw: unknown) {
  const accountId = reqInt(id, 'حساب')
  const data = pickAllowed(requireObject(raw), ['name', 'notes', 'isActive'])
  const patch: Record<string, unknown> = {}
  if ('name' in data) patch.name = reqString(data.name, 'نام حساب')
  if ('notes' in data) patch.notes = optString(data.notes, 'توضیحات')
  if ('isActive' in data) patch.isActive = reqBool(data.isActive, 'وضعیت')
  if (!Object.keys(patch).length) throw new ValidationError('تغییری ارسال نشده است')
  return db.update(schema.accounts).set(patch).where(eq(schema.accounts.id, accountId)).returning().get()
}

export function createValuation(db: Db, raw: unknown) {
  const data = requireObject(raw)
  const accountId = reqInt(data.accountId, 'حساب')
  if (!db.select().from(schema.accounts).where(eq(schema.accounts.id, accountId)).get()) throw new ValidationError('حساب یافت نشد')
  return db.insert(schema.valuations).values({
    accountId,
    date: reqDate(data.date, 'تاریخ'),
    marketValue: reqRial(data.marketValue, 'ارزش بازار', true),
    notes: optString(data.notes, 'توضیحات')
  }).returning().get()
}

export function listValuations(db: Db, accountId: number) {
  return db.select().from(schema.valuations).where(eq(schema.valuations.accountId, accountId))
    .orderBy(desc(schema.valuations.date), desc(schema.valuations.id)).all()
}
