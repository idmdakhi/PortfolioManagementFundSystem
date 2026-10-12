import {
  ValidationError, optString, reqDate, reqEnum, reqInt, reqRial, reqUnitsMicro, requireObject
} from './validation'

export const TRANSACTION_TYPES = ['deposit', 'withdraw', 'dividend', 'fee', 'transfer', 'asset_sale'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]
export const ACCOUNT_TYPES = ['personal', 'fund_share', 'sub_account'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

/** Only these move fund units. */
export const UNIT_TYPES: ReadonlySet<string> = new Set(['deposit', 'withdraw'])

export interface NewEntry {
  accountId: number
  type: TransactionType
  /** integer rials; negative only for reversals */
  amount: number
  /** integer micro-units, or null */
  unitsMicro: number | null
  date: string
  description: string | null
  relatedAssetId: number | null
  relatedTransactionId: number | null
}

export interface StoredEntry {
  id: number; accountId: number; type: string; amount: number
  unitsMicro: number | null; date: string
  relatedAssetId: number | null; relatedTransactionId: number | null
}

/** Parses + validates untrusted input for a new ledger entry (no database needed). */
export function parseNewEntry(raw: unknown): NewEntry {
  const d = requireObject(raw)
  const type = reqEnum(d.type, TRANSACTION_TYPES, 'نوع تراکنش')
  return {
    accountId: reqInt(d.accountId, 'حساب'),
    type,
    amount: reqRial(d.amount, 'مبلغ'),
    unitsMicro: d.units == null ? null : reqUnitsMicro(d.units, 'تعداد واحد'),
    date: reqDate(d.date, 'تاریخ'),
    description: optString(d.description, 'توضیحات'),
    relatedAssetId: null,
    relatedTransactionId: null
  }
}

export function checkEntryAgainstAccount(entry: NewEntry, account: { type: string; isActive: boolean }): void {
  if (!account.isActive) throw new ValidationError('حساب غیرفعال است')
  if (entry.unitsMicro !== null && !UNIT_TYPES.has(entry.type)) {
    throw new ValidationError('تعداد واحد فقط برای واریز و برداشت معتبر است')
  }
  if (account.type === 'fund_share' && UNIT_TYPES.has(entry.type) && entry.unitsMicro === null) {
    throw new ValidationError('برای حساب «سهم صندوق» تعداد واحد الزامی است')
  }
}

/** Signed effect of an entry on the unit balance (deposit +, withdraw −; reversals carry negated units). */
export function unitsDeltaMicro(type: string, unitsMicro: number | null): number {
  if (unitsMicro === null) return 0
  if (type === 'deposit') return unitsMicro
  if (type === 'withdraw') return -unitsMicro
  return 0
}

/** Signed effect on invested capital (cost basis). Dividends/fees do not change it. */
export function capitalDelta(type: string, amount: number): number {
  if (type === 'deposit') return amount
  if (type === 'withdraw') return -amount
  return 0
}

export function assertUnitsBalance(currentMicro: number, deltaMicro: number): number {
  const next = currentMicro + deltaMicro
  if (next < 0) throw new ValidationError('موجودی واحد‌های حساب برای این عملیات کافی نیست')
  return next
}

/** A correction is a NEW entry with negated amount/units linked to the original; nothing is edited or deleted. */
export function buildReversal(orig: StoredEntry, date: string): NewEntry {
  if (orig.amount < 0) throw new ValidationError('تراکنش برگشتی را نمی‌توان دوباره برگشت زد')
  return {
    accountId: orig.accountId,
    type: orig.type as TransactionType,
    amount: -orig.amount,
    unitsMicro: orig.unitsMicro === null ? null : -orig.unitsMicro,
    date,
    description: `برگشت تراکنش #${orig.id}`,
    relatedAssetId: orig.relatedAssetId,
    relatedTransactionId: orig.id
  }
}
