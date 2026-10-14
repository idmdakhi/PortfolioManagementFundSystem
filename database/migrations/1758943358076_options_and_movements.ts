import { BaseSchema } from '@adonisjs/lucid/schema'

/** Editable option lists (area kinds, external places, split methods, labels) + metadata of group movements. */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('options', (t) => {
      t.increments('id')
      t.string('list').notNullable()
      t.string('value').notNullable()
      t.string('label').notNullable()
      t.text('extra').nullable()
      t.boolean('active').notNullable().defaultTo(true)
      t.boolean('builtin').notNullable().defaultTo(false)
      t.integer('sort').notNullable().defaultTo(0)
      t.unique(['list', 'value'])
    })
    this.schema.createTable('movements', (t) => {
      t.increments('id')
      t.string('batch_id').notNullable().unique()
      t.string('from_ref').notNullable()
      t.string('to_ref').notNullable()
      t.string('method').notNullable()
      t.bigInteger('total').notNullable().defaultTo(0)
      t.string('occurred_on').notNullable()
      t.string('note').nullable()
      t.integer('created_by').nullable()
      t.timestamp('created_at').notNullable()
    })
    this.defer(async (db) => {
      const split = (engine: string) => JSON.stringify({ engine, roundTo: 1 })
      const rows: Record<string, unknown>[] = [
        ['label', 'tx.issue', 'صدور', null, 1],
        ['label', 'tx.redeem', 'ابطال', null, 1],
        ['label', 'div.fund', 'صندوق', null, 1],
        ['label', 'div.personal', 'حساب شخصی', null, 1],
        ['label', 'area.deposit', 'واریز', null, 1],
        ['label', 'area.withdraw', 'برداشت', null, 1],
        ['area_kind', 'cash', 'نقدی', null, 0],
        ['area_kind', 'property', 'ملک', null, 0],
        ['area_kind', 'other', 'سایر', null, 0],
        ['external_place', 'external', 'خارج از سیستم', null, 1],
        ['split_method', 'equal', 'مساوی', split('equal'), 1],
        ['split_method', 'percent', 'درصدی', split('percent'), 1],
        ['split_method', 'amount', 'مبلغ جداگانه برای هر نفر', split('amount'), 1],
        ['split_method', 'weight', 'به نسبت وزن دلخواه (هر نفر یک عدد)', split('weight'), 1],
        ['split_method', 'units', 'به نسبت واحدهای صندوق', split('units'), 1],
        ['split_method', 'capital', 'به نسبت سرمایهٔ صندوقی', split('capital'), 1],
      ].map(([list, value, label, extra, builtin], i) => ({ list, value, label, extra, active: true, builtin: !!builtin, sort: i }))
      await db.table('options').multiInsert(rows)
    })
  }

  async down() {
    this.schema.dropTable('movements')
    this.schema.dropTable('options')
  }
}
