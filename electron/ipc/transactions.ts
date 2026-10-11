import { ipcMain } from 'electron'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { getDb, schema } from '../../database/index'
import { TRANSACTION_TYPES, createTransaction, reverseTransaction, summarize } from '../services/ledger'
import { reqDate, reqEnum, reqInt, optInt, requireObject } from '../services/validation'

export function registerTransactionHandlers() {
  ipcMain.handle('transactions:list', async (_e, raw?: unknown) => {
    const f = raw == null ? {} : requireObject(raw, 'filters')
    const conditions = []
    const accountId = optInt(f.accountId, 'حساب')
    if (accountId != null) conditions.push(eq(schema.transactions.accountId, accountId))
    if (f.type != null && f.type !== '') conditions.push(eq(schema.transactions.type, reqEnum(f.type, TRANSACTION_TYPES, 'نوع')))
    if (f.fromDate != null) conditions.push(gte(schema.transactions.date, reqDate(f.fromDate, 'از تاریخ')))
    if (f.toDate != null) conditions.push(lte(schema.transactions.date, reqDate(f.toDate, 'تا تاریخ')))
    const limit = f.limit == null ? 500 : reqInt(f.limit, 'limit', 1, 5000)
    return getDb().select().from(schema.transactions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.transactions.date), desc(schema.transactions.id))
      .limit(limit).all()
  })

  ipcMain.handle('transactions:create', async (_e, data: unknown) => createTransaction(getDb(), data))

  // Replaces the old 'transactions:delete': ledger entries are corrected, never removed.
  ipcMain.handle('transactions:reverse', async (_e, id: unknown) => reverseTransaction(getDb(), reqInt(id, 'id')))

  ipcMain.handle('transactions:summary', async (_e, accountId: unknown, fromDate: unknown, toDate: unknown) =>
    summarize(getDb(), reqInt(accountId, 'حساب'), reqDate(fromDate, 'از تاریخ'), reqDate(toDate, 'تا تاریخ')))
}
