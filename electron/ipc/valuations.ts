import { ipcMain } from 'electron'
import { createValuation, latestValuation, listValuations } from '../../data/accountRepo'
import { getDb } from '../../data/index'
import { reqInt } from '../../core/validation'

export function registerValuationHandlers() {
  ipcMain.handle('valuations:create', async (_e, data: unknown) => createValuation(getDb(), data))
  ipcMain.handle('valuations:latest', async (_e, accountId: unknown) => latestValuation(getDb(), reqInt(accountId, 'حساب')) ?? null)
  ipcMain.handle('valuations:list', async (_e, accountId: unknown) => listValuations(getDb(), reqInt(accountId, 'حساب')))
}
