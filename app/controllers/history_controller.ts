import type { HttpContext } from '@adonisjs/core/http'
import HistoryPeriod from '#models/history_period'

/** Yearly return / fee figures from before the system (shown under «سود و زیان صندوق»). */
export default class HistoryController {
  private read(b: Record<string, unknown>) {
    const label = String(b.label ?? '').trim()
    const returnPct = Number(b.returnPct)
    const fee = Math.round(Number(b.fee) || 0)
    if (!label || !Number.isFinite(returnPct) || String(b.returnPct ?? '').trim() === '') return null
    return { label, returnPct, fee }
  }

  async store({ request, response, session }: HttpContext) {
    const d = this.read(request.all())
    if (!d) session.flash('error', 'سال و بازدهی را وارد کنید.')
    else {
      await HistoryPeriod.create(d)
      session.flash('ok', 'اضافه شد.')
    }
    return response.redirect('/periods')
  }

  async update({ request, params, response, session }: HttpContext) {
    const d = this.read(request.all())
    const row = await HistoryPeriod.find(Number(params.id))
    if (!d || !row) session.flash('error', 'اطلاعات معتبر نیست.')
    else {
      row.merge(d)
      await row.save()
      session.flash('ok', 'ذخیره شد.')
    }
    return response.redirect('/periods')
  }

  async destroy({ params, response, session }: HttpContext) {
    const row = await HistoryPeriod.find(Number(params.id))
    if (row) await row.delete()
    session.flash('ok', 'حذف شد.')
    return response.redirect('/periods')
  }
}
