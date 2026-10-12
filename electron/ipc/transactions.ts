import { ipcMain } from 'electron'
import { getDb } from '../../data/index'
import { createTransaction, listTransactions, reverseTransaction, summarize } from '../../data/ledgerRepo'
import { reqDate, reqInt } from '../../core/validation'

// Thin layer: validation + business rules live in /core and /data.
export function registerTransactionHandlers() {
  ipcMain.handle('transactions:list', async (_e, filters?: unknown) => listTransactions(getDb(), filters))
  ipcMain.handle('transactions:create', async (_e, data: unknown) => createTransaction(getDb(), data))
  // Ledger entries are corrected, never removed: a reversal is a new, negating entry.
  ipcMain.handle('transactions:reverse', async (_e, id: unknown) => reverseTransaction(getDb(), reqInt(id, 'id')))
  ipcMain.handle('transactions:summary', async (_e, accountId: unknown, fromDate: unknown, toDate: unknown) =>
    summarize(getDb(), reqInt(accountId, 'حساب'), reqDate(fromDate, 'از تاریخ'), reqDate(toDate, 'تا تاریخ')))
}
