import { ipcMain } from 'electron'
import { desc } from 'drizzle-orm'
import { getDb, schema } from '../../data/index'
import { closePeriod, createPeriod, currentPeriod, listSnapshots, previewClose } from '../../data/periodRepo'

export function registerPeriodHandlers() {
  ipcMain.handle('periods:list', async () =>
    getDb().select().from(schema.fiscalPeriods).orderBy(desc(schema.fiscalPeriods.startDate)).all())
  ipcMain.handle('periods:create', async (_e, data: unknown) => createPeriod(getDb(), data))
  ipcMain.handle('periods:preview', async (_e, id: unknown) => previewClose(getDb(), id))
  ipcMain.handle('periods:close', async (_e, id: unknown) => closePeriod(getDb(), id))
  ipcMain.handle('periods:snapshots', async (_e, id: unknown) => listSnapshots(getDb(), id))
  ipcMain.handle('periods:current', async () => currentPeriod(getDb()))
}
