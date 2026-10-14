import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { exportAll, importAll, validateBackup, TABLES } from '#services/backup'
import { toJalaliStr, todayIso } from '#services/jalali'
import { invalidateOptions } from '#services/options'

const stamp = () => {
  const d = new Date()
  const hm = String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0')
  return `${toJalaliStr(todayIso()).replace(/\//g, '-')}-${hm}`
}

export default class BackupController {
  async index({ view }: HttpContext) {
    const data = await exportAll()
    return view.render('pages/backup', { nav: 'bk', counts: data.counts, tables: TABLES })
  }

  async export({ response }: HttpContext) {
    const data = await exportAll()
    response.header('Content-Type', 'application/json; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="fund-backup-${stamp()}.json"`)
    return response.send(JSON.stringify(data, null, 2))
  }

  async import({ request, response, session }: HttpContext) {
    const fail = (msg: string) => {
      session.flash('error', msg)
      return response.redirect('/backup')
    }
    const file = request.file('file', { size: '25mb', extnames: ['json'] })
    if (!file) return fail('فایل پشتیبان را انتخاب کنید.')
    if (!file.isValid) return fail(file.errors[0]?.message ?? 'فایل معتبر نیست.')
    let data: any
    try {
      data = JSON.parse(await readFile(file.tmpPath!, 'utf8'))
    } catch {
      return fail('فایل JSON خوانده نشد.')
    }
    const err = validateBackup(data)
    if (err) return fail(err)

    // Safety net: keep the current data on the server before replacing it.
    const dir = app.tmpPath('backups')
    await mkdir(dir, { recursive: true })
    const snap = `pre-restore-${stamp()}.json`
    await writeFile(`${dir}/${snap}`, JSON.stringify(await exportAll(), null, 2))
    try {
      await importAll(data)
      invalidateOptions()
    } catch (e) {
      return fail('بازیابی انجام نشد و داده‌ها تغییری نکردند: ' + (e as Error).message)
    }
    session.flash('ok', `پشتیبان بازیابی شد. نسخهٔ قبلی داده‌ها در tmp/backups/${snap} ذخیره شد.`)
    return response.redirect('/backup')
  }
}
