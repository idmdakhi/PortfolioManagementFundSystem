import { InvestorSchema } from '#database/schema'
import { hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import PersonalAccount from '#models/personal_account'

export default class Investor extends InvestorSchema {
  @hasOne(() => PersonalAccount)
  declare personal: HasOne<typeof PersonalAccount>
}
