import { eq } from 'drizzle-orm'
import * as schema from './schema'
import type { Db, Executor } from './db'
import { DEFAULT_SETTINGS, type SettingKey } from './default-settings'
import type { CalculationSettings } from '../core/calculations'
import { ValidationError, reqString } from '../core/validation'

const NUMERIC_RULES: Partial<Record<SettingKey, { min: number; max: number; int?: boolean }>> = {
  guaranteed_return_rate: { min: 0, max: 1000 },
  fixed_fee_rate: { min: 0, max: 100 },
  performance_fee_rate: { min: 0, max: 100 },
  max_fee_cap: { min: 1, max: 1e15 },
  fee_rounding: { min: 0, max: 1e12 },
  default_period_months: { min: 1, max: 120, int: true }
}
const ENUM_RULES: Partial<Record<SettingKey, readonly string[]>> = {
  fee_rounding_mode: ['floor', 'round', 'ceil'],
  currency_display: ['toman', 'rial']
}

export function isSettingKey(k: string): k is SettingKey {
  return Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, k)
}

export function validateSetting(key: string, value: unknown): string {
  if (!isSettingKey(key)) throw new ValidationError('کلید تنظیمات نامعتبر است')
  const str = reqString(typeof value === 'number' ? String(value) : value, 'مقدار', 100)
  const num = NUMERIC_RULES[key]
  if (num) {
    const n = Number(str)
    if (!Number.isFinite(n) || n < num.min || n > num.max || (num.int && !Number.isInteger(n))) {
      throw new ValidationError(`مقدار باید عددی بین ${num.min} و ${num.max}${num.int ? ' (صحیح)' : ''} باشد`)
    }
    return String(n)
  }
  const en = ENUM_RULES[key]
  if (en && !en.includes(str)) throw new ValidationError(`مقدار مجاز: ${en.join(' / ')}`)
  return str
}

export function setSetting(db: Db, key: unknown, value: unknown) {
  const k = reqString(key, 'کلید', 100)
  const v = validateSetting(k, value)
  return db.insert(schema.settings)
    .values({ key: k, value: v, description: DEFAULT_SETTINGS[k as SettingKey].description })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: v, updatedAt: new Date().toISOString() } })
    .returning().get()
}

function num(map: Record<string, string>, key: SettingKey): number {
  const parsed = Number(map[key])
  return map[key] !== undefined && Number.isFinite(parsed) ? parsed : Number(DEFAULT_SETTINGS[key].value)
}

/** Reads calculation settings; a missing/corrupt stored value falls back to its default (never NaN). */
export function readCalculationSettings(db: Executor): CalculationSettings {
  const map: Record<string, string> = {}
  for (const row of db.select().from(schema.settings).all()) map[row.key] = row.value
  const mode = map.fee_rounding_mode
  return {
    guaranteedReturnRate: num(map, 'guaranteed_return_rate'),
    fixedFeeRate: num(map, 'fixed_fee_rate'),
    performanceFeeRate: num(map, 'performance_fee_rate'),
    maxFeeCap: num(map, 'max_fee_cap'),
    feeRounding: num(map, 'fee_rounding'),
    feeRoundingMode: mode === 'round' || mode === 'ceil' ? mode : 'floor',
    periodMonths: Math.round(num(map, 'default_period_months'))
  }
}

export function getSetting(db: Db, key: unknown): string | null {
  const k = reqString(key, 'کلید', 100)
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, k)).get()
  return row?.value ?? (isSettingKey(k) ? DEFAULT_SETTINGS[k].value : null)
}
