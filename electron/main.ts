import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { closeDatabase, getBackupsDir, getSqlite, getStorageDir, initDatabase } from '../data/index'
import { backupDatabase } from '../data/backup'
import { registerAllIpcHandlers } from './ipc/index'

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) app.quit()

let mainWindow: BrowserWindow | null = null

// Only these Electron paths may be queried from the renderer.
const ALLOWED_PATHS = new Set(['userData', 'documents', 'downloads', 'desktop'])

function dailyBackup() {
  try { backupDatabase(getSqlite(), getBackupsDir()) } catch (err) { console.error('Backup failed:', err) }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1100, minHeight: 700,
    show: false, title: 'مدیریت صندوق سبدگردانی',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // The preload only uses contextBridge/ipcRenderer, so it works in a sandboxed renderer.
      sandbox: true, contextIsolation: true, nodeIntegration: false
    }
  })
  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      if (new URL(details.url).protocol === 'https:') shell.openExternal(details.url)
    } catch { /* malformed URL: ignore */ }
    return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const storage = getStorageDir()
  const reportsPath = join(storage, 'reports')
  if (!existsSync(reportsPath)) mkdirSync(reportsPath, { recursive: true })

  // Creates/migrates the database. If it fails, stop: running without a DB would only hide data loss.
  try {
    initDatabase()
    console.log('Database initialized')
    dailyBackup()
  } catch (err) {
    console.error(err)
    dialog.showErrorBox('خطای پایگاه داده', `راه‌اندازی دیتابیس ناموفق بود:\n${(err as Error).message}`)
    app.quit()
    return
  }

  registerAllIpcHandlers()
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getPath', (_e, name: unknown) => {
    if (typeof name !== 'string' || !ALLOWED_PATHS.has(name)) throw new Error('Path not allowed')
    return app.getPath(name as 'userData')
  })
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

let quitting = false
app.on('before-quit', () => {
  if (quitting) return
  quitting = true
  dailyBackup()
  try { closeDatabase() } catch { /* already closed */ }
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
