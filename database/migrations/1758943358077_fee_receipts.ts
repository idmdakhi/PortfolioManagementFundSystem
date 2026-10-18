import { BaseSchema } from '@adonisjs/lucid/schema'

/** Fees actually received (fund and personal), and a marker for fee-unit transactions. */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('transactions', (t) => {
      t.string('kind').notNullable().defaultTo('normal')
    })
    this.schema.createTable('fee_receipts', (t) => {
      t.increments('id')
      t.string('scope').notNullable()
      t.integer('investor_id').unsigned().nullable().references('id').inTable('investors')
      t.bigInteger('amount').notNullable()
      t.string('occurred_on').notNullable()
      t.string('method').notNullable()
      t.string('note').nullable()
      t.integer('tx_id').nullable()
      t.integer('created_by').nullable()
      t.timestamp('created_at').notNullable()
    })
    this.defer(async (db) => {
      const me = (await db.from('investors').where('name', 'خودم').first()) ?? (await db.from('investors').orderBy('id').first())
      await db.table('options').insert({
        list: 'setting', value: 'manager_investor', label: 'سرمایه‌گذار سبدگردان (دریافت‌کنندهٔ واحد کارمزد)',
        extra: JSON.stringify({ investorId: me ? me.id : null }), active: true, builtin: true, sort: 99,
      })
    })
  }

  async down() {
    this.schema.dropTable('fee_receipts')
    this.schema.alterTable('transactions', (t) => t.dropColumn('kind'))
  }
}
