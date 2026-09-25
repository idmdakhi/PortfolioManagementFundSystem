import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'group_transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('tx_date', 20).notNullable()
      table
        .enum('type', ['income', 'expense', 'deposit', 'withdraw', 'adjustment'])
        .notNullable()
      table.bigInteger('total_amount').notNullable()
      table.enum('target_type', ['group', 'specific_people']).notNullable()
      table
        .integer('group_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('groups')
        .onDelete('SET NULL')
      /** JSON array of { personId, value } */
      table.text('specific_shares').notNullable().defaultTo('[]')
      table.enum('allocation_method', ['equal', 'percent', 'fixed_amount']).notNullable()
      table.text('description').nullable()
      table.timestamp('created_at').notNullable()

      table.index(['tx_date'])
      table.index(['group_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
