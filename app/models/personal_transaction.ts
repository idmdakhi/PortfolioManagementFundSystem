import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Person from './person.js'

export type PersonalTxType =
  | 'deposit'             // واریز
  | 'withdraw'            // برداشت
  | 'mark_to_market'      // ثبت ارزش روز حساب شخصی
  | 'adjustment'          // تعدیل

export default class PersonalTransaction extends BaseModel {
  static table = 'personal_transactions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare txDate: string

  @column()
  declare personId: number

  @column()
  declare type: PersonalTxType

  /** مبلغ یا ارزش روز (ریال) */
  @column()
  declare amount: number

  @column()
  declare assetType: string | null  // سکه، دلار، سهام، ملک، سپرده، سایر

  @column()
  declare description: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Person)
  declare person: BelongsTo<typeof Person>
}
