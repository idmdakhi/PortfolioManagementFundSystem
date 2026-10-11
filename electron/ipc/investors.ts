import { ipcMain } from 'electron'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../database/index'
import { ValidationError, optString, pickAllowed, reqBool, reqInt, reqString, requireObject } from '../services/validation'

export function registerInvestorHandlers() {
  ipcMain.handle('investors:list', async () =>
    getDb().select().from(schema.investors).orderBy(schema.investors.name).all())

  ipcMain.handle('investors:get', async (_e, id: unknown) =>
    getDb().select().from(schema.investors).where(eq(schema.investors.id, reqInt(id, 'سرمایه‌گذار'))).get())

  ipcMain.handle('investors:create', async (_e, raw: unknown) => {
    const data = requireObject(raw)
    return getDb().insert(schema.investors).values({
      name: reqString(data.name, 'نام'),
      relation: optString(data.relation, 'نسبت', 200),
      notes: optString(data.notes, 'توضیحات')
    }).returning().get()
  })

  ipcMain.handle('investors:update', async (_e, id: unknown, raw: unknown) => {
    const investorId = reqInt(id, 'سرمایه‌گذار')
    const data = pickAllowed(requireObject(raw), ['name', 'relation', 'notes', 'isActive'])
    const patch: Record<string, unknown> = {}
    if ('name' in data) patch.name = reqString(data.name, 'نام')
    if ('relation' in data) patch.relation = optString(data.relation, 'نسبت', 200)
    if ('notes' in data) patch.notes = optString(data.notes, 'توضیحات')
    if ('isActive' in data) patch.isActive = reqBool(data.isActive, 'وضعیت')
    if (!Object.keys(patch).length) throw new ValidationError('تغییری ارسال نشده است')
    return getDb().update(schema.investors).set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(schema.investors.id, investorId)).returning().get()
  })

  ipcMain.handle('investors:deactivate', async (_e, id: unknown) =>
    getDb().update(schema.investors).set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(schema.investors.id, reqInt(id, 'سرمایه‌گذار'))).returning().get())

  ipcMain.handle('investors:accounts', async (_e, investorId: unknown) =>
    getDb().select().from(schema.accounts).where(eq(schema.accounts.investorId, reqInt(investorId, 'سرمایه‌گذار'))).all())
}
