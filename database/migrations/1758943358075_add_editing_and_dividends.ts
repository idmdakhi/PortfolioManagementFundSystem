import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // ── تراکنشها: Soft-delete + رهگیری ویرایش + ارجاع به تراکنش معکوس
    this.schema.alterTable('transactions', (t) => {
      t.boolean('is_deleted').notNullable().defaultTo(false)
      t.integer('edited_by').nullable()
      t.timestamp('edited_at').nullable()
      t.integer('reverses_id').nullable()
      t.string('edit_note').nullable()
    })

    // ── سود تقسیمی حساب شخصی
    this.schema.alterTable('personal_accounts', (t) => {
      t.bigInteger('dividends').notNullable().defaultTo(0)
    })

    // ── تاریخچه دورهها (Snapshot در لحظه بستن دوره)
    this.schema.createTable('period_snapshots', (t) => {
      t.increments('id')
      t.integer('period_id').unsigned().notNullable()
      t.string('label').notNullable()
      t.string('end_jalali').notNullable()
      t.integer('months').notNullable().defaultTo(12)
      t.double('total_units').notNullable().defaultTo(0)
      t.bigInteger('total_cost').notNullable().defaultTo(0)
      t.bigInteger('begin_cost').notNullable().defaultTo(0)
      t.bigInteger('deposits').notNullable().defaultTo(0)
      t.bigInteger('withdrawals').notNullable().defaultTo(0)
      t.bigInteger('dividends').notNullable().defaultTo(0)
      t.bigInteger('market_value').notNullable().defaultTo(0)
      t.bigInteger('gross_profit').notNullable().defaultTo(0)
      t.bigInteger('fixed_profit').notNullable().defaultTo(0)
      t.bigInteger('excess_profit').notNullable().defaultTo(0)
      t.bigInteger('mgmt_fee').notNullable().defaultTo(0)
      t.bigInteger('excess_fee').notNullable().defaultTo(0)
      t.bigInteger('total_fee').notNullable().defaultTo(0)
      t.bigInteger('fund_profit').notNullable().defaultTo(0)
      t.double('nav').notNullable().defaultTo(0)
      t.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('period_snapshots')
    this.schema.alterTable('personal_accounts', (t) => t.dropColumn('dividends'))
    this.schema.alterTable('transactions', (t) => {
      t.dropColumn('is_deleted')
      t.dropColumn('edited_by')
      t.dropColumn('edited_at')
      t.dropColumn('reverses_id')
      t.dropColumn('edit_note')
    })
  }
}
