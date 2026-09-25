import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'personal_transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('tx_date', 20).notNullable()
      table
        .integer('person_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('people')
        .onDelete('CASCADE')
      table
        .enum('type', ['deposit', 'withdraw', 'mark_to_market', 'adjustment'])
        .notNullable()
      table.bigInteger('amount').notNullable()
      table.string('asset_type', 50).nullable()
      table.text('description').nullable()
      table.timestamp('created_at').notNullable()

      table.index(['person_id', 'type'])
      table.index(['tx_date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
