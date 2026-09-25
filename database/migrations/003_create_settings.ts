import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('fund_name', 200).notNullable().defaultTo('صندوق سبدگردانی خانوادگی')
      table.string('currency', 20).notNullable().defaultTo('ریال')
      table.string('date_type', 20).notNullable().defaultTo('شمسی')
      table.integer('report_year').notNullable().defaultTo(1404)
      table.bigInteger('base_unit_price').notNullable().defaultTo(10_000)
      table.decimal('client_fixed_rate', 8, 4).notNullable().defaultTo(0.2)
      table.decimal('manager_fixed_fee_rate', 8, 4).notNullable().defaultTo(0.01)
      table.decimal('default_excess_fee_rate', 8, 4).notNullable().defaultTo(0.2)
      table.bigInteger('default_fee_cap').notNullable().defaultTo(1_000_000_000)
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
