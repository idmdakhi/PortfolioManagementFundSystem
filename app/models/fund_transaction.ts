import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Person from './person.js'

export type FundTxType =
  | 'buy_units'           // خرید واحد (واریز)
  | 'sell_units'          // ابطال واحد (برداشت)
  | 'mark_to_market'      // ثبت ارزش روز کل صندوق (نام خالی)
  | 'adjustment'          // تعدیل / رفع مغایرت

export default class FundTransaction extends BaseModel {
  static table = 'fund_transactions'

  @column({ isPrimary: true })
  declare id: number

  /** تاریخ شمسی به‌صورت رشته YYYY/MM/DD یا میلادی — بسته به تنظیمات */
  @column()
  declare txDate: string

  /** null برای mark_to_market سطح صندوق */
  @column()
  declare personId: number | null

  @column()
  declare type: FundTxType

  /** مبلغ ریال (برای mark_to_market = ارزش روز کل صندوق) */
  @column()
  declare amount: number

  /** تعداد واحد — معمولاً amount / baseUnitPrice */
  @column()
  declare units: number | null

  @column()
  declare description: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Person)
  declare person: BelongsTo<typeof Person>
}
