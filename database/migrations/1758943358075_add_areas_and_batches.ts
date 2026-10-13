import { BaseSchema } from '@adonisjs/lucid/schema'

/** Additive: group id on transactions, plus investment areas (cash, property, ...) and their entries. */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('transactions', (t) => {
      t.string('batch_id').nullable()
    })
    this.schema.createTable('areas', (t) => {
      t.increments('id')
      t.string('name').notNullable()
      t.string('kind').notNullable().defaultTo('other')
      t.string('notes').nullable()
      t.bigInteger('market_value').notNullable().defaultTo(0)
      t.string('valued_on').nullable()
      t.timestamp('created_at').notNullable()
      t.timestamp('updated_at').nullable()
    })
    this.schema.createTable('area_entries', (t) => {
      t.increments('id')
      t.integer('area_id').unsigned().notNullable().references('id').inTable('areas')
      t.integer('investor_id').unsigned().notNullable().references('id').inTable('investors')
      t.string('type').notNullable()
      t.bigInteger('amount').notNullable()
      t.string('occurred_on').notNullable()
      t.string('note').nullable()
      t.string('batch_id').notNullable()
      t.integer('created_by').nullable()
      t.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('area_entries')
    this.schema.dropTable('areas')
    this.schema.alterTable('transactions', (t) => t.dropColumn('batch_id'))
  }
}
