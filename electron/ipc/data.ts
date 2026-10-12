import { BrowserWindow, dialog, ipcMain } from 'electron'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getBackupsDir, getDb, getSqlite } from '../../data/index'
import { backupDatabase } from '../../data/backup'
import { fullJson, ledgerCsv } from '../../data/exporter'

export function registerDataHandlers() {
  // Manual backup into <storage>/backups (also done automatically at startup and on quit).
  ipcMain.handle('data:backupNow', async () => backupDatabase(getSqlite(), getBackupsDir()))

  // Lets the user pick a folder, then writes the full ledger (CSV) and every table (JSON) there.
  ipcMain.handle('data:exportAll', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const options = { properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[] }
    const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    const dir = res.filePaths[0]
    if (res.canceled || !dir) return null
    mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().slice(0, 10)
    const csvPath = join(dir, `ledger-${stamp}.csv`)
    const jsonPath = join(dir, `portfolio-${stamp}.json`)
    writeFileSync(csvPath, ledgerCsv(getDb()), 'utf8')
    writeFileSync(jsonPath, JSON.stringify(fullJson(getDb()), null, 2), 'utf8')
    return { dir, files: [csvPath, jsonPath] }
  })
}
