import { ipcMain } from 'electron'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../database/index'
import { DEFAULT_SETTINGS, type SettingKey } from '../../database/default-settings'
import { ValidationError, reqString } from '../services/validation'

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

function isSettingKey(k: string): k is SettingKey {
  return Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, k)
}

function validateSetting(key: string, value: unknown): string {
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

/** Reads a numeric setting; falls back to the default if the stored value is missing/corrupt. */
function num(map: Record<string, string>, key: SettingKey): number {
  const parsed = Number(map[key])
  return map[key] !== undefined && Number.isFinite(parsed) ? parsed : Number(DEFAULT_SETTINGS[key].value)
}

export function registerSettingsHandlers() {
  ipcMain.handle('settings:list', async () => getDb().select().from(schema.settings).all())

  ipcMain.handle('settings:get', async (_e, key: unknown) => {
    const k = reqString(key, 'کلید', 100)
    const row = getDb().select().from(schema.settings).where(eq(schema.settings.key, k)).get()
    return row?.value ?? (isSettingKey(k) ? DEFAULT_SETTINGS[k].value : null)
  })

  ipcMain.handle('settings:set', async (_e, key: unknown, value: unknown) => {
    const k = reqString(key, 'کلید', 100)
    const v = validateSetting(k, value)
    return getDb().insert(schema.settings)
      .values({ key: k, value: v, description: DEFAULT_SETTINGS[k as SettingKey].description })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: v, updatedAt: new Date().toISOString() } })
      .returning().get()
  })

  ipcMain.handle('settings:getCalculationSettings', async () => {
    const map: Record<string, string> = {}
    for (const row of getDb().select().from(schema.settings).all()) map[row.key] = row.value
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
  })
}
