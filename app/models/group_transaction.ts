import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeSave } from '@adonisjs/lucid/orm'
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

/**
 * قانون قفل‌شده (BusinessRules.md): اثر همیشه تجدید سرمایه‌گذاری است — مفهوم «نقدی» وجود ندارد.
 *   - واحددار صندوق (accountType=fund_and_personal) → افزایش/کاهش بهای تمام‌شده و واحد صندوق
 *   - فقط شخصی (accountType=personal_only) → افزایش/کاهش بهای تمام‌شده حساب شخصی
 * قانون دوم: targetType='group' فقط با allocationMethod='equal' معتبر است (چون اعضای گروه
 * تعداد متغیر دارند و تعریف درصد/مبلغ ثابت به‌ازای هرکدام معنی ندارد). این قانون در beforeSave
 * زیر enforce می‌شود تا یک ردیف ناسازگار (مثلاً group + percent) هرگز ذخیره نشود.
 */
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

  @column()
  declare description: string | null

  /** posted (پیش‌فرض) یا reversed */
  @column()
  declare status: 'posted' | 'reversed'

  @column.dateTime()
  declare reversedAt: DateTime | null

  @column()
  declare reversalOfId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Group)
  declare group: BelongsTo<typeof Group>

  /**
   * سپر دفاعی سطح ORM برای ریسک شناسایی‌شده در بازبینی: DB به‌تنهایی تضمین نمی‌کند
   * که targetType/allocationMethod/groupId/specificShares با هم سازگار باشند.
   * این hook حتی اگر یک Controller آینده این چک را فراموش کند، از ذخیرهٔ ردیف
   * ناسازگار جلوگیری می‌کند. (پیام‌های کاربرپسندتر باید در Validator لایهٔ HTTP باشد؛
   * این‌جا خط دفاعی نهایی است.)
   */
  @beforeSave()
  static async validateTargetConsistency(tx: GroupTransaction) {
    if (tx.targetType === 'group') {
      if (!tx.groupId) {
        throw new Error('GroupTransaction: targetType=group requires groupId.')
      }
      if (tx.allocationMethod !== 'equal') {
        throw new Error(
          'GroupTransaction: targetType=group فقط با allocationMethod=equal مجاز است.'
        )
      }
    } else if (tx.targetType === 'specific_people') {
      if (tx.groupId) {
        throw new Error('GroupTransaction: targetType=specific_people نباید groupId داشته باشد.')
      }
      if (!tx.specificShares || tx.specificShares.length === 0) {
        throw new Error('GroupTransaction: targetType=specific_people به specificShares نیاز دارد.')
      }
    }
  }
}
