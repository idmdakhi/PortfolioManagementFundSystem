import Database from 'better-sqlite3'
import { runMigrations, seedDefaultSettings } from '../database/bootstrap'
import { getDatabasePath } from '../database/index'
import { dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'

// Optional now: the app migrates its own database on startup.
// This script just lets you prepare/upgrade the dev database manually.
const dbPath = getDatabasePath()
if (!existsSync(dirname(dbPath))) mkdirSync(dirname(dbPath), { recursive: true })
console.log('Initializing database at:', dbPath)
const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const version = runMigrations(sqlite)
seedDefaultSettings(sqlite)
console.log(`Database ready (schema version ${version}).`)
sqlite.close()
