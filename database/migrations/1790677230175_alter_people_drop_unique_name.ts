import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * ریسک شناسایی‌شده در بازبینی: ستون people.name به‌اشتباه UNIQUE بود.
 * هویت واقعی هر شخص باید id باشد نه نام؛ دو مشتری هم‌نام (مثلاً دو «علی»)
 * با این constraint اصلاً قابل ثبت نبودند. این migration آن را برمی‌دارد
 * و به‌جایش یک index معمولی (برای سرعت جست‌وجو، نه یکتایی) می‌گذارد.
 */
export default class extends BaseSchema {
  protected tableName = 'people'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['name'])
      table.index(['name'], 'people_name_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['name'], 'people_name_index')
      table.unique(['name'])
    })
  }
}
