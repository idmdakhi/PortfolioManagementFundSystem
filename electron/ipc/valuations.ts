import { ipcMain } from 'electron'
import { desc, eq, isNull } from 'drizzle-orm'
import { getDb, schema } from '../../database/index'
import { optInt, optString, reqDate, reqNumber, requireObject } from '../services/validation'

function byAccount(accountId: unknown) {
  const id = optInt(accountId, 'حساب')
  return id == null ? isNull(schema.valuations.accountId) : eq(schema.valuations.accountId, id)
}

export function registerValuationHandlers() {
  ipcMain.handle('valuations:create', async (_e, raw: unknown) => {
    const data = requireObject(raw)
    return getDb().insert(schema.valuations).values({
      accountId: optInt(data.accountId, 'حساب'),
      date: reqDate(data.date, 'تاریخ'),
      costBasis: reqNumber(data.costBasis, 'بهای تمام‌شده', { min: 0 }),
      marketValue: reqNumber(data.marketValue, 'ارزش بازار', { min: 0 }),
      units: reqNumber(data.units, 'تعداد واحد', { min: 0 }),
      notes: optString(data.notes, 'توضیحات')
    }).returning().get()
  })

  ipcMain.handle('valuations:latest', async (_e, accountId?: unknown) =>
    getDb().select().from(schema.valuations).where(byAccount(accountId))
      .orderBy(desc(schema.valuations.date), desc(schema.valuations.id)).get())

  ipcMain.handle('valuations:list', async (_e, accountId?: unknown) =>
    getDb().select().from(schema.valuations).where(byAccount(accountId))
      .orderBy(desc(schema.valuations.date), desc(schema.valuations.id)).all())
}
