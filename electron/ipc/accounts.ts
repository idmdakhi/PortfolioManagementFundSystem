import { ipcMain } from 'electron'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../data/index'
import { createAccount, updateAccount } from '../../data/accountRepo'
import { reqInt } from '../../core/validation'

export function registerAccountHandlers() {
  ipcMain.handle('accounts:create', async (_e, data: unknown) => createAccount(getDb(), data))
  ipcMain.handle('accounts:update', async (_e, id: unknown, data: unknown) => updateAccount(getDb(), id, data))
  ipcMain.handle('accounts:get', async (_e, id: unknown) =>
    getDb().select().from(schema.accounts).where(eq(schema.accounts.id, reqInt(id, 'حساب'))).get())
}
