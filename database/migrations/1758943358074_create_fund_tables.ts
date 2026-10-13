import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('periods', (t) => {
      t.increments('id')
      t.string('label').notNullable()
      t.string('end_jalali').notNullable()
      t.integer('months').notNullable().defaultTo(12)
      t.bigInteger('begin_cost').notNullable().defaultTo(0)
      t.bigInteger('opening_deposits').notNullable().defaultTo(0)
      t.bigInteger('opening_withdrawals').notNullable().defaultTo(0)
      t.bigInteger('dividends').notNullable().defaultTo(0)
      t.bigInteger('market_value_base').notNullable().defaultTo(0)
      t.integer('valuation_tx_id').notNullable().defaultTo(0)
      t.double('fixed_rate').notNullable().defaultTo(20)
      t.double('mgmt_rate').notNullable().defaultTo(1)
      t.double('excess_rate').notNullable().defaultTo(10)
      t.double('fee_cap').notNullable().defaultTo(100)
      t.bigInteger('discount').notNullable().defaultTo(0)
      t.double('mgmt_rate_2').notNullable().defaultTo(1)
      t.double('excess_rate_2').notNullable().defaultTo(20)
      t.timestamp('created_at').notNullable()
      t.timestamp('updated_at').nullable()
    })
    this.schema.createTable('investors', (t) => {
      t.increments('id')
      t.string('name').notNullable()
      t.string('notes').nullable()
      t.double('opening_units').notNullable().defaultTo(0)
      t.double('opening_cost').notNullable().defaultTo(0)
      t.timestamp('created_at').notNullable()
      t.timestamp('updated_at').nullable()
    })
    this.schema.createTable('transactions', (t) => {
      t.increments('id')
      t.integer('investor_id').unsigned().notNullable().references('id').inTable('investors')
      t.string('type').notNullable()
      t.bigInteger('amount').notNullable()
      t.double('nav').notNullable()
      t.double('units').notNullable()
      t.string('occurred_on').notNullable()
      t.string('note').nullable()
      t.integer('created_by').nullable()
      t.timestamp('created_at').notNullable()
    })
    this.schema.createTable('personal_accounts', (t) => {
      t.increments('id')
      t.integer('investor_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('investors')
      t.bigInteger('begin_cost').notNullable().defaultTo(0)
      t.bigInteger('deposits').notNullable().defaultTo(0)
      t.bigInteger('withdrawals').notNullable().defaultTo(0)
      t.bigInteger('end_cost').notNullable().defaultTo(0)
      t.bigInteger('market_value').notNullable().defaultTo(0)
    })
  }

  async down() {
    for (const n of ['personal_accounts', 'transactions', 'investors', 'periods'])
      this.schema.dropTable(n)
  }
}
