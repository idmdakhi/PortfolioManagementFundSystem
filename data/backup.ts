import type Database from 'better-sqlite3'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs'
import { join } from 'path'

const FILE_RE = /^portfolio-\d{8}.*\.sqlite$/

/**
 * Consistent online backup via `VACUUM INTO` (safe while the DB is open, WAL included).
 * One file per day (a second backup the same day replaces it); keeps the newest `keep` files.
 */
export function backupDatabase(
  sqlite: Database.Database, dir: string, opts: { keep?: number; label?: string; now?: Date } = {}
): string {
  const { keep = 30, label = '', now = new Date() } = opts
  mkdirSync(dir, { recursive: true })
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '')
  const file = join(dir, `portfolio-${ymd}${label}.sqlite`)
  if (existsSync(file)) rmSync(file)
  sqlite.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`)
  prune(dir, keep)
  return file
}

function prune(dir: string, keep: number): void {
  const files = readdirSync(dir)
    .filter((f) => FILE_RE.test(f))
    .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t || (a.f < b.f ? 1 : -1))
  for (const old of files.slice(keep)) rmSync(join(dir, old.f))
}
