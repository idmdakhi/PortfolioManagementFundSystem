import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const investors = sqliteTable('investors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  relation: text('relation'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
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
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  totalValue: real('total_value').notNull().default(0),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const assetOwnerships = sqliteTable('asset_ownerships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetId: integer('asset_id').notNull().references(() => assets.id),
  investorId: integer('investor_id').references(() => investors.id),
  accountId: integer('account_id').references(() => accounts.id),
  sharePercent: real('share_percent').notNull(),
  shareValue: real('share_value').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  type: text('type').notNull(),
  amount: real('amount').notNull(),
  units: real('units'),
  date: text('date').notNull(),
  description: text('description'),
  relatedAssetId: integer('related_asset_id').references(() => assets.id),
  relatedTransactionId: integer('related_transaction_id'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const valuations = sqliteTable('valuations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').references(() => accounts.id),
  date: text('date').notNull(),
  costBasis: real('cost_basis').notNull().default(0),
  marketValue: real('market_value').notNull().default(0),
  units: real('units').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const fiscalPeriods = sqliteTable('fiscal_periods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  months: integer('months').notNull().default(12),
  isClosed: integer('is_closed', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const snapshots = sqliteTable('snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').references(() => accounts.id),
  periodId: integer('period_id').references(() => fiscalPeriods.id),
  year: integer('year'),
  registeredCapital: real('registered_capital').default(0),
  costBasis: real('cost_basis').default(0),
  marketValue: real('market_value').default(0),
  returnPercent: real('return_percent').default(0),
  managerFee: real('manager_fee').default(0),
  units: real('units').default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const accountUnits = sqliteTable('account_units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id).unique(),
  units: real('units').notNull().default(0),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})
