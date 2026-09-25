import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'people'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name', 120).notNullable().unique()
      table
        .integer('group_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('groups')
        .onDelete('SET NULL')
      table.enum('account_type', ['fund_and_personal', 'personal_only']).notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.decimal('excess_fee_rate', 8, 4).notNullable().defaultTo(0.2)
      table.bigInteger('fee_cap').notNullable().defaultTo(1_000_000_000)
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
