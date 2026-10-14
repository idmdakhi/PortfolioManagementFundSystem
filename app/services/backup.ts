import db from '@adonisjs/lucid/services/db'

export const FORMAT = 'fund-backup'
export const VERSION = 1

/** Insert order (parents first). Users are deliberately NOT part of a backup (no password hashes in files). */
export const TABLES = [
  'periods', 'investors', 'history_periods', 'areas',
  'personal_accounts', 'dividends', 'transactions', 'area_entries',
  'options', 'movements',
] as const
/** Older backup files may not have these; when absent the current rows are left untouched. */
export const OPTIONAL = new Set<string>(['options', 'movements'])

export async function exportAll() {
  const tables: Record<string, unknown[]> = {}
  const counts: Record<string, number> = {}
  for (const t of TABLES) {
    tables[t] = await db.from(t).orderBy('id')
    counts[t] = tables[t].length
  }
  return { format: FORMAT, version: VERSION, app: 'fund-server', exportedAt: new Date().toISOString(), counts, tables }
}

/** Returns an error message, or null when the file looks like a valid backup. */
export function validateBackup(data: unknown): string | null {
  if (!data || typeof data !== 'object') return 'فایل پشتیبان معتبر نیست.'
  const d = data as { format?: unknown; version?: unknown; tables?: Record<string, unknown> }
  if (d.format !== FORMAT) return 'این فایل، پشتیبان این برنامه نیست.'
  if (d.version !== VERSION) return 'نسخهٔ این پشتیبان پشتیبانی نمی‌شود.'
  if (!d.tables || typeof d.tables !== 'object') return 'جدول‌های پشتیبان پیدا نشد.'
  for (const t of TABLES) {
    const rows = d.tables[t]
    if (rows === undefined && OPTIONAL.has(t)) continue
    if (!Array.isArray(rows)) return `جدول «${t}» در فایل نیست.`
    const ids = new Set<number>()
    for (const r of rows) {
      if (!r || typeof r !== 'object' || typeof (r as { id?: unknown }).id !== 'number') return `ردیف نامعتبر در «${t}».`
      const id = (r as { id: number }).id
      if (ids.has(id)) return `شناسهٔ تکراری در «${t}».`
      ids.add(id)
    }
  }
  return null
}

/** Replaces all fund data with the backup, atomically (nothing changes if anything fails). */
export async function importAll(data: { tables: Record<string, Record<string, unknown>[]> }) {
  const client = db.connection().getWriteClient()
  const allowed = new Map<string, Set<string>>()
  for (const t of TABLES) allowed.set(t, new Set(Object.keys(await client(t).columnInfo())))

  await db.transaction(async (trx) => {
    const present = TABLES.filter((t) => Array.isArray(data.tables[t]))
    for (const t of [...present].reverse()) await trx.from(t).delete()
    for (const t of present) {
      const cols = allowed.get(t)!
      const rows = data.tables[t].map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => cols.has(k))))
      for (let i = 0; i < rows.length; i += 50) await trx.table(t).multiInsert(rows.slice(i, i + 50))
    }
    if (db.connection().dialect.name === 'postgres') {
      for (const t of present) {
        await trx.rawQuery(`select setval(pg_get_serial_sequence('${t}', 'id'), coalesce(max(id), 1), max(id) is not null) from ${t}`)
      }
    }
  })
  return Object.fromEntries(TABLES.filter((t) => Array.isArray(data.tables[t])).map((t) => [t, data.tables[t].length]))
}
