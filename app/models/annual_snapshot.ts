import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Person from './person.js'

/** آرشیو پایان سال مالی برای نمودار رشد چندساله */
export default class AnnualSnapshot extends BaseModel {
  static table = 'annual_snapshots'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare year: number

  @column()
  declare personId: number

  @column()
  declare fundValue: number

  @column()
  declare personalValue: number

  @column()
  declare totalAum: number

  @column()
  declare feeCharged: number

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Person)
  declare person: BelongsTo<typeof Person>
}
