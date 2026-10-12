import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import type { Db } from './db'
import { MIGRATIONS, runMigrations, seedDefaultSettings } from './migrations'
import { backupDatabase } from './backup'
import { join, dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'

let sqlite: Database.Database | null = null
let db: Db | null = null

/** Single source of truth for where app data lives (database, backups, reports). */
export function getStorageDir(): string {
  if (process.versions.electron) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    if (app?.isPackaged) return join(app.getPath('userData'), 'storage')
  }
  return join(process.cwd(), 'storage')
}
export const getDatabasePath = () => join(getStorageDir(), 'portfolio.sqlite')
export const getBackupsDir = () => join(getStorageDir(), 'backups')

/** Opens (creating/migrating as needed). Pass ':memory:' in tests. */
export function initDatabase(path: string = getDatabasePath()): Db {
  if (path !== ':memory:' && !existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true })
  const conn = new Database(path)
  conn.pragma('journal_mode = WAL')
  conn.pragma('foreign_keys = ON')
  runMigrations(conn, MIGRATIONS, {
    // An upgrade of an existing database always takes a backup first.
    beforeUpgrade: (from) => { if (path !== ':memory:') backupDatabase(conn, getBackupsDir(), { label: `-pre-v${from}` }) }
  })
  seedDefaultSettings(conn)
  sqlite = conn
  db = drizzle(conn, { schema })
  return db
}

export function getDb(): Db { return db ?? initDatabase() }
export function getSqlite(): Database.Database { getDb(); return sqlite as Database.Database }
export function closeDatabase(): void { sqlite?.close(); sqlite = null; db = null }

export { schema }
