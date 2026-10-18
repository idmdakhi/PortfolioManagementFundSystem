import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Fund valuation as a dated ledger (opening value, interim valuations, closing value) instead of one
 * overwritten number, plus a bank-interest setting used as the fixed rate for customers and the fund.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('valuations', (t) => {
      t.increments('id')
      t.string('occurred_on').notNullable()
      t.bigInteger('market_value').notNullable()
      t.string('kind').notNullable().defaultTo('value')
      t.string('note').nullable()
      t.integer('created_by').nullable()
      t.timestamp('created_at').notNullable()
    })
    this.defer(async (db) => {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const periods = await db.from('periods').orderBy('start_on')
      const rows: Record<string, unknown>[] = []
      for (const p of periods) {
        rows.push({ occurred_on: p.start_on, market_value: p.begin_market, kind: 'open', note: 'ارزش ابتدای دوره', created_at: now })
        const inRange = p.valuation_on >= p.start_on && p.valuation_on <= p.end_on
        if (p.status === 'closed') {
          rows.push({ occurred_on: inRange ? p.valuation_on : p.end_on, market_value: p.market_value_base, kind: 'close', note: 'ارزش پایانی دوره', created_at: now })
        } else if (inRange) {
          rows.push({ occurred_on: p.valuation_on, market_value: p.market_value_base, kind: 'value', note: 'آخرین ارزش‌گذاری', created_at: now })
        }
      }
      if (rows.length) await db.table('valuations').multiInsert(rows)
      await db.table('options').insert({
        list: 'setting', value: 'bank_rate', label: 'سود بانکی (سود ثابت مشتری و صندوق)، درصد سالانه',
        extra: JSON.stringify({ rate: 24.67 }), active: true, builtin: true, sort: 98,
      })
      // The open period uses the current bank rate; closed periods keep the rate they were calculated with.
      await db.from('periods').where('status', 'open').update({ fixed_rate: 24.67 })
    })
  }

  async down() {
    this.schema.dropTable('valuations')
  }
}
