import type Database from 'better-sqlite3'
import { DEFAULT_SETTINGS } from './default-settings'

/**
 * Versioned schema migrations, tracked with SQLite's `PRAGMA user_version`.
 *
 * - Migration #1 is idempotent (CREATE TABLE IF NOT EXISTS), so databases that
 *   were created earlier by `scripts/init-db.ts` (user_version = 0) upgrade cleanly.
 * - Never edit an existing entry; append a new one.
 * - Keep `database/schema.ts` (Drizzle types) in sync with the result by hand.
 *
 * This runs on every app start (see `initDatabase`), so the packaged app
 * creates/updates its own database — it no longer depends on `npm run db:init`.
 */
export const MIGRATIONS: readonly string[] = [
  // 1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS investors (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, relation TEXT, notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, investor_id INTEGER NOT NULL REFERENCES investors(id),
    name TEXT NOT NULL, type TEXT NOT NULL, parent_account_id INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL,
    total_value REAL NOT NULL DEFAULT 0, notes TEXT, is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS asset_ownerships (
    id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL REFERENCES assets(id),
    investor_id INTEGER REFERENCES investors(id), account_id INTEGER REFERENCES accounts(id),
    share_percent REAL NOT NULL, share_value REAL NOT NULL DEFAULT 0, notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL REFERENCES accounts(id),
    type TEXT NOT NULL, amount REAL NOT NULL, units REAL, date TEXT NOT NULL, description TEXT,
    related_asset_id INTEGER REFERENCES assets(id), related_transaction_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS valuations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER REFERENCES accounts(id),
    date TEXT NOT NULL, cost_basis REAL NOT NULL DEFAULT 0, market_value REAL NOT NULL DEFAULT 0,
    units REAL NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS fiscal_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, start_date TEXT NOT NULL,
    end_date TEXT NOT NULL, months INTEGER NOT NULL DEFAULT 12, is_closed INTEGER NOT NULL DEFAULT 0,
    notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER REFERENCES accounts(id),
    period_id INTEGER REFERENCES fiscal_periods(id), year INTEGER,
    registered_capital REAL DEFAULT 0, cost_basis REAL DEFAULT 0, market_value REAL DEFAULT 0,
    return_percent REAL DEFAULT 0, manager_fee REAL DEFAULT 0, units REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS account_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(id),
    units REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  `,
  // 2 — indexes for the common lookups
  `
  CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date);
  CREATE INDEX IF NOT EXISTS idx_transactions_related ON transactions(related_transaction_id);
  CREATE INDEX IF NOT EXISTS idx_valuations_account_date ON valuations(account_id, date);
  CREATE INDEX IF NOT EXISTS idx_accounts_investor ON accounts(investor_id);
  `
]

export function runMigrations(sqlite: Database.Database): number {
  const current = Number(sqlite.pragma('user_version', { simple: true })) || 0
  for (let v = current; v < MIGRATIONS.length; v++) {
    sqlite.transaction(() => {
      sqlite.exec(MIGRATIONS[v])
      sqlite.pragma(`user_version = ${v + 1}`)
    })()
  }
  return MIGRATIONS.length
}

export function seedDefaultSettings(sqlite: Database.Database): void {
  const insert = sqlite.prepare('INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)')
  for (const [key, cfg] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, cfg.value, cfg.description)
}
