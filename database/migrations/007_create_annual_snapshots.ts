import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'annual_snapshots'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('year').notNullable()
      table
        .integer('person_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('people')
        .onDelete('CASCADE')
      table.bigInteger('fund_value').notNullable().defaultTo(0)
      table.bigInteger('personal_value').notNullable().defaultTo(0)
      table.bigInteger('total_aum').notNullable().defaultTo(0)
      table.bigInteger('fee_charged').notNullable().defaultTo(0)
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()

      table.unique(['year', 'person_id'])
      table.index(['year'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
