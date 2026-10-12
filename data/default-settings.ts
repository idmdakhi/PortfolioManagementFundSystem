export const DEFAULT_SETTINGS = {
  guaranteed_return_rate: { value: '20', description: 'نرخ سود تضمینی سالانه (درصد)' },
  fixed_fee_rate: { value: '1', description: 'نرخ کارمزد ثابت سالانه سبدگردان (درصد)' },
  performance_fee_rate: { value: '20', description: 'نرخ کارمزد عملکرد از مازاد سود (درصد)' },
  max_fee_cap: { value: '1000000000', description: 'سقف کارمزد سالانه (ریال) — برای دوره‌های غیر ۱۲ ماهه متناسب می‌شود' },
  fee_rounding: { value: '100000', description: 'مضرب رند کردن کارمزد (ریال)' },
  fee_rounding_mode: { value: 'floor', description: 'جهت رند کردن کارمزد: floor (پایین) / round (نزدیک‌ترین) / ceil (بالا)' },
  default_period_months: { value: '12', description: 'طول دوره مالی پیش‌فرض (ماه)' },
  currency: { value: 'ریال', description: 'واحد پول' },
  currency_display: { value: 'toman', description: 'نمایش به ریال یا تومان' }
} as const
export type SettingKey = keyof typeof DEFAULT_SETTINGS
