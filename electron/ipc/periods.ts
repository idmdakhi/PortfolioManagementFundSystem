import { ipcMain } from 'electron'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { getDb, schema } from '../../database/index'
import { ValidationError, optString, reqDate, reqInt, reqString, requireObject } from '../services/validation'

export function registerPeriodHandlers() {
  ipcMain.handle('periods:list', async () =>
    getDb().select().from(schema.fiscalPeriods).orderBy(desc(schema.fiscalPeriods.startDate)).all())

  ipcMain.handle('periods:create', async (_e, raw: unknown) => {
    const data = requireObject(raw)
    const name = reqString(data.name, 'نام دوره')
    const startDate = reqDate(data.startDate, 'تاریخ شروع')
    const endDate = reqDate(data.endDate, 'تاریخ پایان')
    const months = reqInt(data.months, 'تعداد ماه', 1, 120)
    if (startDate > endDate) throw new ValidationError('تاریخ شروع باید قبل از تاریخ پایان باشد')

    return getDb().transaction((tx) => {
      // Overlap: existing.start <= newEnd AND existing.end >= newStart
      const overlap = tx.select().from(schema.fiscalPeriods)
        .where(and(lte(schema.fiscalPeriods.startDate, endDate), gte(schema.fiscalPeriods.endDate, startDate))).get()
      if (overlap) throw new ValidationError(`با دوره «${overlap.name}» همپوشانی دارد`)
      return tx.insert(schema.fiscalPeriods).values({ name, startDate, endDate, months, notes: optString(data.notes, 'توضیحات') })
        .returning().get()
    })
  })

  ipcMain.handle('periods:close', async (_e, id: unknown) =>
    getDb().update(schema.fiscalPeriods).set({ isClosed: true })
      .where(eq(schema.fiscalPeriods.id, reqInt(id, 'دوره'))).returning().get())

  ipcMain.handle('periods:current', async () =>
    getDb().select().from(schema.fiscalPeriods).where(eq(schema.fiscalPeriods.isClosed, false))
      .orderBy(desc(schema.fiscalPeriods.startDate)).get())
}
