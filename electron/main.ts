import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, copyFileSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

/**
 * ==========================================================================
 * ۱) مسیر دیتابیس — طبق تصمیم فاز ۴: SQLite باید کنار خودِ اپ در userData
 *    بنشیند، نه در tmp/ که با هر آپدیت اپ ممکن است پاک شود.
 * ==========================================================================
 */
function resolveDbPath(): string {
  if (isDev) {
    // در dev همان مسیر همیشگی repo را نگه می‌داریم تا با seed/migrate فعلی هماهنگ بماند
    return path.join(process.cwd(), 'tmp', 'db.sqlite3')
  }
  const userDataDir = app.getPath('userData')
  const dbPath = path.join(userDataDir, 'db.sqlite3')
  if (!existsSync(dbPath)) {
    // اولین اجرا: یک دیتابیس خالی (فقط migration‌شده، از resources بسته‌بندی‌شده) کپی می‌شود
    const seedDbPath = path.join(process.resourcesPath, 'db-template.sqlite3')
    if (existsSync(seedDbPath)) {
      copyFileSync(seedDbPath, dbPath)
    }
  }
  return dbPath
}

const DB_PATH = resolveDbPath()
process.env.DB_PATH = DB_PATH // خوانده می‌شود توسط config/database.ts

/**
 * ==========================================================================
 * ۲) بوت AdonisJS + Lucid *بدون* هیچ HTTP listener — دقیقاً همان الگویی که
 *    با `node ace <command>` (بدون httpServer) اثبات شد. کد کامپایل‌شدهٔ
 *    Adonis (از `node ace build`) اینجا import می‌شود، نه سورس TS خام.
 * ==========================================================================
 */
async function bootAdonis() {
  await import('reflect-metadata')
  const { Ignitor } = await import('@adonisjs/core/ignitor')

  // در dev: main.js کامپایل‌شده در build/electron/electron/main.js می‌نشیند؛
  //   دو سطح بالاتر همان build/ ریشهٔ Adonis است (همان‌جا که #models/* resolve می‌شود).
  // در packaged: resources خارج از asar است، پس باید از process.resourcesPath
  //   (نه import.meta.url نسبی که داخل asar بی‌معنی/غیرقابل‌دسترس است) ساخته شود.
  const backendRoot = isDev
    ? new URL('../../', import.meta.url)
    : new URL('file://' + path.join(process.resourcesPath, 'backend') + '/')

  const ignitor = new Ignitor(backendRoot)
  ignitor.tap((adonisApp) => {
    adonisApp.booting(async () => {
      await import(new URL('start/env.js', backendRoot).href)
    })
  })

  const adonisApp = ignitor.createApp('console')
  await adonisApp.init()
  await adonisApp.boot()
  return adonisApp
}

/**
 * ==========================================================================
 * ۳) پنجرهٔ اصلی
 * ==========================================================================
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // .cjs عمدی است: پریلود Electron به import ES Module اعتماد نمی‌کند؛
      // preload.cts با module=CommonJS کامپایل می‌شود (نگاه کنید docs/Electron.md)
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // تست دودی End-to-End بدون نیاز به کلیک دستی: با E2E_SMOKE_TEST=1 اجرا کنید؛
  // پنجره واقعاً لود می‌شود، IPC واقعی صدا زده می‌شود، نتیجه در stdout چاپ و اپ بسته می‌شود.
  if (process.env.E2E_SMOKE_TEST) {
    win.webContents.once('did-finish-load', async () => {
      const result = await win.webContents.executeJavaScript(`
        (async () => {
          const peopleBefore = await window.api.people.list()
          const groups = await window.api.groups.list()
          return { peopleCount: peopleBefore.length, firstName: peopleBefore[0]?.name, groupsCount: groups.length }
        })()
      `)
      console.log('__E2E_RESULT__' + JSON.stringify(result))
      app.quit()
    })
    win.webContents.once('did-fail-load', (_e, code, desc) => {
      console.log('__E2E_FAIL__' + JSON.stringify({ code, desc }))
      app.quit()
    })
  }
}

app.whenReady().then(async () => {
  await bootAdonis()

  const { registerPeopleIpc } = await import('./ipc/people.js')
  const { registerGroupsIpc } = await import('./ipc/groups.js')
  registerPeopleIpc(ipcMain)
  registerGroupsIpc(ipcMain)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
