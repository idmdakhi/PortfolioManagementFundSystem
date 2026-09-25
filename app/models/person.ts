import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Group from './group.js'
import FundTransaction from './fund_transaction.js'
import PersonalTransaction from './personal_transaction.js'

/** نوع حساب: واحددار صندوق + شخصی، یا فقط شخصی */
export type AccountType = 'fund_and_personal' | 'personal_only'

export default class Person extends BaseModel {
  static table = 'people'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare groupId: number | null

  /** fund_and_personal | personal_only */
  @column()
  declare accountType: AccountType

  /** فعال / غیرفعال */
  @column()
  declare isActive: boolean

  /** نرخ سهم مازاد کارمزد (مثلاً 0.10 یا 0.20) */
  @column()
  declare excessFeeRate: number

  /** سقف کارمزد سالانه (ریال) */
  @column()
  declare feeCap: number

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Group)
  declare group: BelongsTo<typeof Group>

  @hasMany(() => FundTransaction)
  declare fundTransactions: HasMany<typeof FundTransaction>

  @hasMany(() => PersonalTransaction)
  declare personalTransactions: HasMany<typeof PersonalTransaction>
}
