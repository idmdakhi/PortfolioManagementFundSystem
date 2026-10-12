import type Database from 'better-sqlite3'
import { DEFAULT_SETTINGS } from './default-settings'

/**
 * Versioned migrations (PRAGMA user_version). This is the single source of truth for the schema.
 * Rules: never edit an existing entry — append a new one — and mirror the change in data/schema.ts.
 *
 * Integrity is enforced by the database itself, not only by application code:
 *   • money/units must be stored as integers (typeof CHECKs)
 *   • the ledger is append-only (UPDATE/DELETE are rejected by triggers)
 *   • no entries inside a closed fiscal period
 *   • a unit balance can never go negative
 */
const DATE = `GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`

export const MIGRATIONS: readonly string[] = [
  // 1 — complete schema
  `
  CREATE TABLE investors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    relation TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investor_id INTEGER NOT NULL REFERENCES investors(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'fund_share', 'sub_account')),
    parent_account_id INTEGER REFERENCES accounts(id),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'stock', 'real_estate', 'other')),
    total_value INTEGER NOT NULL DEFAULT 0 CHECK (typeof(total_value) = 'integer' AND total_value >= 0),
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE asset_ownerships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL REFERENCES assets(id),
    investor_id INTEGER REFERENCES investors(id),
    account_id INTEGER REFERENCES accounts(id),
    share_percent REAL NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
    share_value INTEGER NOT NULL DEFAULT 0 CHECK (typeof(share_value) = 'integer'),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'dividend', 'fee', 'transfer', 'asset_sale')),
    amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount <> 0),
    units_micro INTEGER CHECK (units_micro IS NULL OR (typeof(units_micro) = 'integer' AND units_micro <> 0)),
    date TEXT NOT NULL CHECK (date ${DATE}),
    description TEXT,
    related_asset_id INTEGER REFERENCES assets(id),
    related_transaction_id INTEGER REFERENCES transactions(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (units_micro IS NULL OR type IN ('deposit', 'withdraw'))
  );

  CREATE TABLE valuations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    date TEXT NOT NULL CHECK (date ${DATE}),
    market_value INTEGER NOT NULL CHECK (typeof(market_value) = 'integer' AND market_value >= 0),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE fiscal_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL CHECK (start_date ${DATE}),
    end_date TEXT NOT NULL CHECK (end_date ${DATE}),
    months INTEGER NOT NULL DEFAULT 12 CHECK (months BETWEEN 1 AND 120),
    is_closed INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (start_date <= end_date)
  );

  CREATE TABLE snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL REFERENCES fiscal_periods(id),
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    cost_basis INTEGER NOT NULL CHECK (typeof(cost_basis) = 'integer'),
    average_capital INTEGER NOT NULL CHECK (typeof(average_capital) = 'integer'),
    market_value INTEGER NOT NULL CHECK (typeof(market_value) = 'integer'),
    market_value_source TEXT NOT NULL CHECK (market_value_source IN ('valuation', 'cost_basis')),
    dividends INTEGER NOT NULL CHECK (typeof(dividends) = 'integer'),
    gross_profit INTEGER NOT NULL CHECK (typeof(gross_profit) = 'integer'),
    guaranteed_profit INTEGER NOT NULL CHECK (typeof(guaranteed_profit) = 'integer'),
    manager_fee INTEGER NOT NULL CHECK (typeof(manager_fee) = 'integer' AND manager_fee >= 0),
    return_percent REAL NOT NULL,
    units_micro INTEGER NOT NULL CHECK (typeof(units_micro) = 'integer'),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (period_id, account_id)
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_accounts_investor ON accounts(investor_id);
  CREATE INDEX idx_transactions_account_date ON transactions(account_id, date);
  CREATE INDEX idx_transactions_related ON transactions(related_transaction_id);
  CREATE INDEX idx_valuations_account_date ON valuations(account_id, date);

  -- Ledger and snapshots are append-only: corrections are new (reversal) entries.
  CREATE TRIGGER trg_transactions_no_update BEFORE UPDATE ON transactions
  BEGIN SELECT RAISE(ABORT, 'transactions are append-only'); END;
  CREATE TRIGGER trg_transactions_no_delete BEFORE DELETE ON transactions
  BEGIN SELECT RAISE(ABORT, 'transactions are append-only'); END;
  CREATE TRIGGER trg_snapshots_no_update BEFORE UPDATE ON snapshots
  BEGIN SELECT RAISE(ABORT, 'snapshots are immutable'); END;
  CREATE TRIGGER trg_snapshots_no_delete BEFORE DELETE ON snapshots
  BEGIN SELECT RAISE(ABORT, 'snapshots are immutable'); END;

  -- No entries inside a closed fiscal period.
  CREATE TRIGGER trg_transactions_period_open BEFORE INSERT ON transactions
  WHEN EXISTS (SELECT 1 FROM fiscal_periods WHERE is_closed = 1 AND NEW.date BETWEEN start_date AND end_date)
  BEGIN SELECT RAISE(ABORT, 'fiscal period is closed'); END;

  -- A unit balance can never become negative.
  CREATE TRIGGER trg_transactions_units_nonneg BEFORE INSERT ON transactions
  WHEN NEW.units_micro IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'unit balance would become negative')
    WHERE COALESCE((
      SELECT SUM(CASE type WHEN 'deposit' THEN units_micro WHEN 'withdraw' THEN -units_micro ELSE 0 END)
      FROM transactions WHERE account_id = NEW.account_id AND units_micro IS NOT NULL
    ), 0) + (CASE NEW.type WHEN 'deposit' THEN NEW.units_micro WHEN 'withdraw' THEN -NEW.units_micro ELSE 0 END) < 0;
  END;
  `
]

export interface MigrationHooks {
  /** Called once, before pending migrations run on an EXISTING database (e.g. to take a backup). */
  beforeUpgrade?: (fromVersion: number, toVersion: number) => void
}

export function currentVersion(sqlite: Database.Database): number {
  return Number(sqlite.pragma('user_version', { simple: true })) || 0
}

export function runMigrations(
  sqlite: Database.Database, migrations: readonly string[] = MIGRATIONS, hooks: MigrationHooks = {}
): number {
  const current = currentVersion(sqlite)
  if (current > migrations.length) {
    throw new Error(`Database schema v${current} is newer than this app supports (v${migrations.length}). Update the app.`)
  }
  if (current > 0 && current < migrations.length) hooks.beforeUpgrade?.(current, migrations.length)
  for (let v = current; v < migrations.length; v++) {
    sqlite.transaction(() => {
      sqlite.exec(migrations[v])
      sqlite.pragma(`user_version = ${v + 1}`)
    })()
  }
  return migrations.length
}

export function seedDefaultSettings(sqlite: Database.Database): void {
  const insert = sqlite.prepare('INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)')
  for (const [key, cfg] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, cfg.value, cfg.description)
}
