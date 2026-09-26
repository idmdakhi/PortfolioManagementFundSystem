/**
 * Seed اولیه بر اساس لیست توافق‌شده در اکسل
 * اجرا: node ace db:seed
 *
 * توجه: این فایل اسکلت است؛ بعد از `node ace init` و تنظیم Lucid
 * باید از BaseSeeder رسمی Adonis استفاده شود.
 */

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
