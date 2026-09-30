import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * ریسک شناسایی‌شده در بازبینی: BusinessRules.md و Ledger.md وعده می‌دهند که
 * «تراکنش posted حذف نمی‌شود؛ با reversal مدیریت می‌شود» ولی هیچ ستونی برای
 * این قابلیت در schema وجود نداشت. این migration آن را به هر سه جدول تراکنشی
 * اضافه می‌کند تا وعدهٔ مستندات واقعاً قابل‌پیاده‌سازی باشد.
 *
 * status: 'posted' حالت عادی · 'reversed' یعنی این ردیف با یک ردیف اصلاحی خنثی شده
 * reversalOfId: اگر این ردیف خودش یک اصلاح (reversal) برای ردیف دیگری‌ست، به آن اشاره می‌کند
 */
const TABLES = ['fund_transactions', 'personal_transactions', 'group_transactions'] as const

export default class extends BaseSchema {
  async up() {
    for (const tableName of TABLES) {
      this.schema.alterTable(tableName, (table) => {
        table.string('status', 20).notNullable().defaultTo('posted')
        table.timestamp('reversed_at').nullable()
        table.integer('reversal_of_id').unsigned().nullable()
        table.index(['status'], `${tableName}_status_index`)
      })
    }
  }

  async down() {
    for (const tableName of TABLES) {
      this.schema.alterTable(tableName, (table) => {
        table.dropIndex(['status'], `${tableName}_status_index`)
        table.dropColumn('status')
        table.dropColumn('reversed_at')
        table.dropColumn('reversal_of_id')
      })
    }
  }
}
