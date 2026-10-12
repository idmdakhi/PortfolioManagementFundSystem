import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schemaNs from './schema'

export type Db = BetterSQLite3Database<typeof schemaNs>
/** Anything that can run queries: the Db itself or a transaction handle inside `db.transaction`. */
export type Executor = Pick<Db, 'select' | 'insert' | 'update' | 'delete'>
