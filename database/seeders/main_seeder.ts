/**
 * Seed اولیه بر اساس لیست توافق‌شده در اکسل
 * اجرا: node ace db:seed
 */
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import type Group from '#models/group'
import Person from '#models/person'
import Setting from '#models/setting'

export const seedGroups = [
  { id: 0, name: 'مشتری', isActive: true },
  { id: 1, name: 'خانواده‌ام', isActive: true },
  { id: 2, name: 'خانواده من', isActive: true },
  { id: 3, name: 'خانواده همسر', isActive: false },
]
type SeedPerson = {
  name: string
  groupId: Group['id']
  accountType: Person['accountType']
  excessFeeRate: number
  feeCap: number
}
export const seedPeople = [
  {
    name: 'خودم',
    groupId: 1,
    accountType: 'fund_and_personal',
    excessFeeRate: 0,
    feeCap: 1_000_000_000,
  },
  {
    name: 'همسر',
    groupId: 1,
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'مادر',
    groupId: 2,
    accountType: 'fund_and_personal',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'پژمان (برادر)',
    groupId: 2,
    accountType: 'fund_and_personal',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'عباس',
    groupId: 2,
    accountType: 'fund_and_personal',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'زهرا (خاله)',
    groupId: 4,
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'فرزانه (خاله)',
    groupId: 4,
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'محبوبه (عمه)',
    groupId: 4,
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'امینه (خاله)',
    groupId: 4,
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'محمود منتجب',
    groupId: 4,
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
] satisfies SeedPerson[]

export const seedSettings = {
  fundName: 'صندوق سبدگردانی خانوادگی',
  currency: 'ریال',
  dateType: 'شمسی',
  reportYear: 1404,
  baseUnitPrice: 10_000,
  clientFixedRate: 0.2,
  managerFixedFeeRate: 0.01,
  defaultExcessFeeRate: 0.2,
  defaultFeeCap: 1_000_000_000,
}

/**
 * اتصال واقعی به Adonis: `node ace db:seed` این کلاس را اجرا می‌کند.
 * idempotent است — با اجرای دوباره رکورد تکراری نمی‌سازد (بر اساس نام).
 */
export default class MainSeeder extends BaseSeeder {
  async run() {
    await Person.updateOrCreateMany(
      'name',
      seedPeople.map((p) => ({
        name: p.name,
        groupId: p.groupId,
        accountType: p.accountType,
        excessFeeRate: p.excessFeeRate,
        feeCap: p.feeCap,
        isActive: true,
      }))
    )

    const existingSetting = await Setting.first()
    if (existingSetting) {
      existingSetting.merge(seedSettings)
      await existingSetting.save()
    } else {
      await Setting.create(seedSettings)
    }
  }
}
