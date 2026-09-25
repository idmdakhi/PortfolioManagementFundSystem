import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * تنظیمات سراسری صندوق — معمولاً یک ردیف.
 * نرخ‌های پیش‌فرض؛ per-person در جدول people قابل override است.
 */
export default class Setting extends BaseModel {
  static table = 'settings'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fundName: string

  /** ریال / تومان / دلار */
  @column()
  declare currency: string

  /** شمسی / میلادی */
  @column()
  declare dateType: string

  @column()
  declare reportYear: number

  /** قیمت پایه هر واحد برای تبدیل مبلغ ↔ واحد */
  @column()
  declare baseUnitPrice: number

  /** نرخ سود ثابت مشتری (مثلاً 0.20) */
  @column()
  declare clientFixedRate: number

  /** نرخ کارمزد ثابت سبدگردان (مثلاً 0.01) */
  @column()
  declare managerFixedFeeRate: number

  /** نرخ پیش‌فرض سهم مازاد */
  @column()
  declare defaultExcessFeeRate: number

  /** سقف پیش‌فرض کارمزد سالانه (ریال) */
  @column()
  declare defaultFeeCap: number

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
