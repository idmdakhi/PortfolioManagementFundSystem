import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { runMigrations, seedDefaultSettings } from './bootstrap'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: ReturnType<typeof drizzle<typeof schema>> | null = null

/** Single source of truth for where app data lives (DB + reports). */
export function getStorageDir(): string {
  if (process.versions.electron) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    if (app?.isPackaged) return join(app.getPath('userData'), 'storage')
  }
  return join(process.cwd(), 'storage')
}

export function getDatabasePath(): string {
  return join(getStorageDir(), 'database.sqlite')
}

/** Opens (and, if needed, creates/migrates) the database. Pass ':memory:' in tests. */
export function initDatabase(path: string = getDatabasePath()) {
  if (path !== ':memory:') {
    const dir = join(path, '..')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
  const sqlite = new Database(path)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  runMigrations(sqlite)
  seedDefaultSettings(sqlite)
  db = drizzle(sqlite, { schema })
  return db
}

export function getDb() {
  return db ?? initDatabase()
}

export { schema }
