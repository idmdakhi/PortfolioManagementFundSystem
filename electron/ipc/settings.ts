import { ipcMain } from 'electron'
import { getDb, schema } from '../../data/index'
import { getSetting, readCalculationSettings, setSetting } from '../../data/settingsRepo'

export function registerSettingsHandlers() {
  ipcMain.handle('settings:list', async () => getDb().select().from(schema.settings).all())
  ipcMain.handle('settings:get', async (_e, key: unknown) => getSetting(getDb(), key))
  ipcMain.handle('settings:set', async (_e, key: unknown, value: unknown) => setSetting(getDb(), key, value))
  ipcMain.handle('settings:getCalculationSettings', async () => readCalculationSettings(getDb()))
}
