import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { mkdtempSync, readdirSync, utimesSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { is } from 'drizzle-orm'
import * as schema from '../../data/schema'
import { MIGRATIONS, currentVersion, runMigrations, seedDefaultSettings } from '../../data/migrations'
import { backupDatabase } from '../../data/backup'
import { csvCell, fullJson, ledgerCsv } from '../../data/exporter'
import { setSetting, readCalculationSettings, validateSetting } from '../../data/settingsRepo'
import { createTransaction } from '../../data/ledgerRepo'
import { freshDb } from './helpers'

describe('migrations', () => {
  it('are idempotent and set user_version', () => {
    const s = new Database(':memory:')
    runMigrations(s); runMigrations(s)
    expect(currentVersion(s)).toBe(MIGRATIONS.length)
    seedDefaultSettings(s); seedDefaultSettings(s)
    expect((s.prepare('SELECT COUNT(*) c FROM settings').get() as any).c).toBeGreaterThan(5)
  })

  it('calls beforeUpgrade only for an existing database, then upgrades', () => {
    const migs = ['CREATE TABLE a (x INTEGER);', 'CREATE TABLE b (y INTEGER);']
    const calls: number[][] = []
    const s = new Database(':memory:')
    runMigrations(s, migs.slice(0, 1), { beforeUpgrade: (f, t) => calls.push([f, t]) })
    expect(calls).toEqual([]) // brand-new database: nothing to protect
    runMigrations(s, migs, { beforeUpgrade: (f, t) => calls.push([f, t]) })
    expect(calls).toEqual([[1, 2]])
    expect(currentVersion(s)).toBe(2)
  })

  it('refuses a database from a newer app version', () => {
    const s = new Database(':memory:')
    s.pragma('user_version = 99')
    expect(() => runMigrations(s)).toThrow(/newer/)
  })

  it('drizzle schema.ts matches the migrated database (no drift)', () => {
    const { sqlite } = freshDb()
    const tables = Object.values(schema).filter((v) => is(v, SQLiteTable)) as SQLiteTable[]
    expect(tables.length).toBeGreaterThanOrEqual(9)
    for (const t of tables) {
      const cfg = getTableConfig(t)
      const actual = (sqlite.prepare(`PRAGMA table_info(${cfg.name})`).all() as { name: string }[]).map((c) => c.name).sort()
      expect(cfg.columns.map((c) => c.name).sort(), cfg.name).toEqual(actual)
    }
    const dbTables = (sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map((r) => r.name)
    expect(dbTables.sort()).toEqual(tables.map((t) => getTableConfig(t).name).sort())
  })
})

describe('backup', () => {
  it('creates a restorable copy and keeps only the newest N', () => {
    const { sqlite } = freshDb()
    sqlite.prepare("INSERT INTO accounts (investor_id, name, type) VALUES (1, 'extra', 'personal')").run()
    const dir = mkdtempSync(join(tmpdir(), 'bk-'))
    for (let d = 1; d <= 5; d++) {
      const now = new Date(Date.UTC(2026, 0, d))
      const f = backupDatabase(sqlite, dir, { keep: 3, now })
      utimesSync(f, now, now)
    }
    expect(readdirSync(dir).sort()).toEqual(['portfolio-20260103.sqlite', 'portfolio-20260104.sqlite', 'portfolio-20260105.sqlite'])
    const copy = new Database(join(dir, 'portfolio-20260105.sqlite'), { readonly: true })
    expect((copy.prepare('SELECT COUNT(*) c FROM accounts').get() as any).c).toBe(3)
    expect(currentVersion(copy)).toBe(MIGRATIONS.length)
    copy.close()
  })

  it('a same-day backup replaces the earlier one', () => {
    const { sqlite } = freshDb()
    const dir = mkdtempSync(join(tmpdir(), 'bk-'))
    const now = new Date(Date.UTC(2026, 0, 1))
    backupDatabase(sqlite, dir, { now }); backupDatabase(sqlite, dir, { now })
    expect(readdirSync(dir)).toHaveLength(1)
  })
})

describe('export', () => {
  it('csvCell quotes and neutralises spreadsheet formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('@cmd')).toBe("'@cmd")
    expect(csvCell(-500)).toBe('-500') // numbers are untouched
    expect(csvCell(null)).toBe('')
  })

  it('ledger CSV has a BOM, integer amounts and decimal units', () => {
    const { db, fund } = freshDb()
    createTransaction(db, { accountId: fund, type: 'deposit', amount: 1000, units: 2.5, date: '2026-03-01', description: '=1+1' })
    const csv = ledgerCsv(db)
    expect(csv.startsWith('\uFEFFid,date,investor')).toBe(true)
    expect(csv).toContain(',deposit,1000,2.5,\'=1+1,')
  })

  it('JSON export contains every table', () => {
    const { db } = freshDb()
    const j = fullJson(db, new Date(Date.UTC(2026, 0, 1)))
    expect(j.exportedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(Object.keys(j)).toEqual(expect.arrayContaining(['investors', 'accounts', 'transactions', 'valuations', 'fiscalPeriods', 'snapshots', 'settings']))
  })
})

describe('settings', () => {
  it('validates keys and values; corrupt stored values fall back to defaults', () => {
    const { db, sqlite } = freshDb()
    expect(() => validateSetting('nope', '1')).toThrow()
    expect(() => validateSetting('fixed_fee_rate', 'abc')).toThrow()
    expect(() => validateSetting('fixed_fee_rate', '-1')).toThrow()
    expect(() => validateSetting('default_period_months', '1.5')).toThrow()
    expect(() => validateSetting('fee_rounding_mode', 'sideways')).toThrow()
    setSetting(db, 'fixed_fee_rate', 2)
    expect(readCalculationSettings(db).fixedFeeRate).toBe(2)
    sqlite.prepare("UPDATE settings SET value = 'garbage' WHERE key = 'fixed_fee_rate'").run()
    expect(readCalculationSettings(db).fixedFeeRate).toBe(1) // default, never NaN
  })
})
