/**
 * Seed اولیه بر اساس لیست توافق‌شده در اکسل
 * اجرا: node ace db:seed
 */
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Group from '#models/group'
import Person from '#models/person'
import Setting from '#models/setting'

export const seedGroups = [
  { name: 'خانواده‌ام', isActive: true },
  { name: 'فامیل من', isActive: true },
  { name: 'فامیل همسر', isActive: true },
  { name: 'مشتری', isActive: true },
]

export const seedPeople = [
  {
    name: 'خودم',
    group: 'خانواده‌ام',
    accountType: 'fund_and_personal',
    excessFeeRate: 0,
    feeCap: 1_000_000_000,
  },
  {
    name: 'همسر',
    group: 'خانواده‌ام',
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'مادر',
    group: 'فامیل من',
    accountType: 'fund_and_personal',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'پژمان (برادر)',
    group: 'فامیل من',
    accountType: 'fund_and_personal',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'عباس',
    group: 'فامیل من',
    accountType: 'fund_and_personal',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'زهرا (خاله)',
    group: 'مشتری',
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'فرزانه (خاله)',
    group: 'مشتری',
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'محبوبه (عمه)',
    group: 'مشتری',
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'امینه (خاله)',
    group: 'مشتری',
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
  {
    name: 'محمود منتجب',
    group: 'مشتری',
    accountType: 'personal_only',
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  },
]

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
    const groups = await Group.updateOrCreateMany(
      'name',
      seedGroups.map((g) => ({ name: g.name, isActive: g.isActive }))
    )
    const groupIdByName = new Map(groups.map((g) => [g.name, g.id]))

    await Person.updateOrCreateMany(
      'name',
      seedPeople.map((p) => ({
        name: p.name,
        groupId: groupIdByName.get(p.group) ?? null,
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
