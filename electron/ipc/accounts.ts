import { ipcMain } from 'electron'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../database/index'
import {
  ValidationError, optInt, optString, pickAllowed, reqBool, reqEnum, reqInt, reqNumber, reqString, requireObject
} from '../services/validation'

const ACCOUNT_TYPES = ['personal', 'fund_share', 'sub_account'] as const

export function registerAccountHandlers() {
  ipcMain.handle('accounts:create', async (_e, raw: unknown) => {
    const data = requireObject(raw)
    const investorId = reqInt(data.investorId, 'سرمایه‌گذار')
    const name = reqString(data.name, 'نام حساب')
    const type = reqEnum(data.type, ACCOUNT_TYPES, 'نوع حساب')
    const parentAccountId = optInt(data.parentAccountId, 'حساب والد')
    const notes = optString(data.notes, 'توضیحات')

    return getDb().transaction((tx) => {
      if (!tx.select().from(schema.investors).where(eq(schema.investors.id, investorId)).get()) {
        throw new ValidationError('سرمایه‌گذار یافت نشد')
      }
      if (parentAccountId != null) {
        const parent = tx.select().from(schema.accounts).where(eq(schema.accounts.id, parentAccountId)).get()
        if (!parent || parent.investorId !== investorId) throw new ValidationError('حساب والد نامعتبر است')
      }
      const account = tx.insert(schema.accounts).values({ investorId, name, type, parentAccountId, notes }).returning().get()
      if (type === 'fund_share') tx.insert(schema.accountUnits).values({ accountId: account.id, units: 0 }).run()
      return account
    })
  })

  // investorId and type are immutable after creation; only these fields can change.
  ipcMain.handle('accounts:update', async (_e, id: unknown, raw: unknown) => {
    const accountId = reqInt(id, 'حساب')
    const data = pickAllowed(requireObject(raw), ['name', 'notes', 'isActive'])
    const patch: Record<string, unknown> = {}
    if ('name' in data) patch.name = reqString(data.name, 'نام حساب')
    if ('notes' in data) patch.notes = optString(data.notes, 'توضیحات')
    if ('isActive' in data) patch.isActive = reqBool(data.isActive, 'وضعیت')
    if (!Object.keys(patch).length) throw new ValidationError('تغییری ارسال نشده است')
    return getDb().update(schema.accounts).set(patch).where(eq(schema.accounts.id, accountId)).returning().get()
  })

  ipcMain.handle('accounts:get', async (_e, id: unknown) =>
    getDb().select().from(schema.accounts).where(eq(schema.accounts.id, reqInt(id, 'حساب'))).get())

  ipcMain.handle('accounts:getUnits', async (_e, accountId: unknown) =>
    getDb().select().from(schema.accountUnits).where(eq(schema.accountUnits.accountId, reqInt(accountId, 'حساب'))).get())

  // Manual correction of the unit balance (bypasses the ledger — use sparingly).
  ipcMain.handle('accounts:setUnits', async (_e, accountId: unknown, units: unknown) => {
    const id = reqInt(accountId, 'حساب')
    const value = reqNumber(units, 'تعداد واحد', { min: 0 })
    return getDb().insert(schema.accountUnits).values({ accountId: id, units: value })
      .onConflictDoUpdate({ target: schema.accountUnits.accountId, set: { units: value, updatedAt: new Date().toISOString() } })
      .returning().get()
  })
}
