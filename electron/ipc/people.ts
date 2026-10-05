import type { IpcMain } from 'electron'

/**
 * این فایل نقش «Controller» را بازی می‌کند — چون معماری انتخابی بدون HTTP
 * است، دیگر PeopleController مبتنی بر route لازم نداریم؛ این IPC handlerها
 * مستقیماً مدل Lucid را صدا می‌زنند. اگر بعداً یک نسخهٔ وب هم خواستید،
 * منطق مشترک را می‌شود به یک PeopleService مشترک منتقل کرد.
 */
export function registerPeopleIpc(ipcMain: IpcMain) {
  ipcMain.handle('people:list', async () => {
    const { default: Person } = await import('#models/person')
    const people = await Person.query().preload('group').orderBy('id')
    return people.map((p) => p.serialize())
  })

  ipcMain.handle('people:create', async (_event, data) => {
    const { default: Person } = await import('#models/person')
    const person = await Person.create(data)
    await person.load('group')
    return person.serialize()
  })

  ipcMain.handle('people:update', async (_event, id: number, data) => {
    const { default: Person } = await import('#models/person')
    const person = await Person.findOrFail(id)
    person.merge(data)
    await person.save()
    await person.load('group')
    return person.serialize()
  })

  ipcMain.handle('people:remove', async (_event, id: number) => {
    const { default: Person } = await import('#models/person')
    const { default: FundTransaction } = await import('#models/fund_transaction')
    const { default: PersonalTransaction } = await import('#models/personal_transaction')

    const [fundCount, personalCount] = await Promise.all([
      FundTransaction.query().where('personId', id).count('* as total'),
      PersonalTransaction.query().where('personId', id).count('* as total'),
    ])
    const hasTx = Number(fundCount[0].$extras.total) + Number(personalCount[0].$extras.total) > 0
    if (hasTx) {
      throw new Error(
        'این فرد تراکنش ثبت‌شده دارد؛ برای حفظ سابقهٔ مالی حذف نمی‌شود. به‌جای حذف، وضعیت را «غیرفعال» کنید.'
      )
    }

    const person = await Person.findOrFail(id)
    await person.delete()
    return { ok: true }
  })
}
