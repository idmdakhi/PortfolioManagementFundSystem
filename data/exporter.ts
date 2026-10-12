import { asc, eq } from 'drizzle-orm'
import * as schema from './schema'
import type { Db } from './db'
import { fromMicro } from '../core/money'

/** Prevents spreadsheet formula injection in free-text cells (=, +, -, @, tab, CR), then CSV-quotes. */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Full ledger as CSV (UTF-8 with BOM so Excel shows Persian text correctly). */
export function ledgerCsv(db: Db): string {
  const rows = db.select({
    id: schema.transactions.id, date: schema.transactions.date, investor: schema.investors.name,
    account: schema.accounts.name, type: schema.transactions.type, amount: schema.transactions.amount,
    unitsMicro: schema.transactions.unitsMicro, description: schema.transactions.description,
    related: schema.transactions.relatedTransactionId
  }).from(schema.transactions)
    .innerJoin(schema.accounts, eq(schema.accounts.id, schema.transactions.accountId))
    .innerJoin(schema.investors, eq(schema.investors.id, schema.accounts.investorId))
    .orderBy(asc(schema.transactions.date), asc(schema.transactions.id)).all()
  const header = ['id', 'date', 'investor', 'account', 'type', 'amount_rial', 'units', 'description', 'reverses_id']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([r.id, r.date, r.investor, r.account, r.type, r.amount,
      r.unitsMicro === null ? '' : fromMicro(r.unitsMicro), r.description, r.related].map(csvCell).join(','))
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}

/** Every table as plain JSON (amounts in rials, units in micro-units as stored). */
export function fullJson(db: Db, now: Date = new Date()) {
  return {
    format: 'portfolio-export', version: 1, exportedAt: now.toISOString(),
    amountsUnit: 'rial (integer)', unitsUnit: 'micro-units (units × 1,000,000)',
    investors: db.select().from(schema.investors).all(),
    accounts: db.select().from(schema.accounts).all(),
    transactions: db.select().from(schema.transactions).all(),
    valuations: db.select().from(schema.valuations).all(),
    fiscalPeriods: db.select().from(schema.fiscalPeriods).all(),
    snapshots: db.select().from(schema.snapshots).all(),
    settings: db.select().from(schema.settings).all()
  }
}
