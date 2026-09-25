import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Person from './person.js'

export default class Group extends BaseModel {
  static table = 'groups'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare isActive: boolean

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Person)
  declare members: HasMany<typeof Person>
}
