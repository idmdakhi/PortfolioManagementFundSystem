import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../data/schema'
import { runMigrations, seedDefaultSettings } from '../../data/migrations'

export function freshDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  runMigrations(sqlite)
  seedDefaultSettings(sqlite)
  const db = drizzle(sqlite, { schema })
  const inv = db.insert(schema.investors).values({ name: 'تست' }).returning().get()
  const fund = db.insert(schema.accounts).values({ investorId: inv.id, name: 'صندوق', type: 'fund_share' }).returning().get().id
  const personal = db.insert(schema.accounts).values({ investorId: inv.id, name: 'شخصی', type: 'personal' }).returning().get().id
  return { sqlite, db, investorId: inv.id, fund, personal }
}
