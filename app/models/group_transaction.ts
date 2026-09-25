import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Group from './group.js'

export type GroupTxType =
  | 'income'      // درآمد
  | 'expense'     // هزینه
  | 'deposit'     // واریز (مثلاً فروش زمین)
  | 'withdraw'    // برداشت (مثلاً خرید زمین)
  | 'adjustment'  // تعدیل

export type GroupTargetType = 'group' | 'specific_people'

export type AllocationMethod = 'equal' | 'percent' | 'fixed_amount'

/**
 * سهم هر نفر در هدف «افراد خاص»
 * مثال: [{ personId: 8, value: 60 }, { personId: 9, value: 40 }]
 * value = درصد یا مبلغ ثابت بسته به allocationMethod
 */
export interface SpecificShare {
  personId: number
  value: number
}

export default class GroupTransaction extends BaseModel {
  static table = 'group_transactions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare txDate: string

  @column()
  declare type: GroupTxType

  /** مبلغ کل (ریال) */
  @column()
  declare totalAmount: number

  /** group = کل گروه | specific_people = تا N نفر */
  @column()
  declare targetType: GroupTargetType

  /** وقتی targetType = group */
  @column()
  declare groupId: number | null

  /**
   * وقتی targetType = specific_people
   * JSON: SpecificShare[]
   */
  @column({
    prepare: (value: SpecificShare[]) => JSON.stringify(value ?? []),
    consume: (value: string | SpecificShare[]) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare specificShares: SpecificShare[]

  @column()
  declare allocationMethod: AllocationMethod

  /**
   * همیشه تجدید سرمایه‌گذاری (نقدی حذف شده):
   * واحددار صندوق → افزایش بهای/واحد صندوق
   * فقط شخصی → افزایش بهای حساب شخصی
   */
  @column()
  declare description: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Group)
  declare group: BelongsTo<typeof Group>
}
