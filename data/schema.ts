/**
 * Drizzle mirror of the schema created by data/migrations.ts (migrations are the source of truth;
 * tests/data/schema-drift.test.ts fails if the two disagree).
 *
 * Money      → INTEGER rials.   Units → INTEGER micro-units (1e-6).
 * There is NO stored unit balance: it is always derived from the ledger (see ledgerRepo.unitsBalanceMicro).
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const createdAt = () => text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)

export const investors = sqliteTable('investors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  relation: text('relation'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  investorId: integer('investor_id').notNull().references(() => investors.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  parentAccountId: integer('parent_account_id'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  createdAt: createdAt()
})

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  totalValue: integer('total_value').notNull().default(0),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const assetOwnerships = sqliteTable('asset_ownerships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetId: integer('asset_id').notNull().references(() => assets.id),
  investorId: integer('investor_id').references(() => investors.id),
  accountId: integer('account_id').references(() => accounts.id),
  sharePercent: real('share_percent').notNull(),
  shareValue: integer('share_value').notNull().default(0),
  notes: text('notes'),
  createdAt: createdAt()
})

/** Append-only ledger (the database itself rejects UPDATE/DELETE). */
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  unitsMicro: integer('units_micro'),
  date: text('date').notNull(),
  description: text('description'),
  relatedAssetId: integer('related_asset_id').references(() => assets.id),
  relatedTransactionId: integer('related_transaction_id'),
  createdAt: createdAt()
})

export const valuations = sqliteTable('valuations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  date: text('date').notNull(),
  marketValue: integer('market_value').notNull(),
  notes: text('notes'),
  createdAt: createdAt()
})

export const fiscalPeriods = sqliteTable('fiscal_periods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  months: integer('months').notNull().default(12),
  isClosed: integer('is_closed', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdAt: createdAt()
})

/** Written once when a period is closed; immutable afterwards. */
export const snapshots = sqliteTable('snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  periodId: integer('period_id').notNull().references(() => fiscalPeriods.id),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  costBasis: integer('cost_basis').notNull(),
  averageCapital: integer('average_capital').notNull(),
  marketValue: integer('market_value').notNull(),
  marketValueSource: text('market_value_source').notNull(),
  dividends: integer('dividends').notNull(),
  grossProfit: integer('gross_profit').notNull(),
  guaranteedProfit: integer('guaranteed_profit').notNull(),
  managerFee: integer('manager_fee').notNull(),
  returnPercent: real('return_percent').notNull(),
  unitsMicro: integer('units_micro').notNull(),
  createdAt: createdAt()
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})
