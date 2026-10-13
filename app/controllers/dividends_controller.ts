import type { HttpContext } from '@adonisjs/core/http'
import Dividend from '#models/dividend'
import { loadState } from '#services/fund_state'
import { parseJalali, todayIso, todayJalali } from '#services/jalali'
import { dividendValidator } from '#validators/fund'

export default class DividendsController {
  async index({ view, request }: HttpContext) {
    const st = await loadState()
    const names = new Map(st.investors.map((i) => [i.id, i.name]))
    const scope = String(request.input('scope', ''))
    return view.render('pages/dividends', { nav: 'div', st, names, list: [...st.divs].filter((d) => !['fund', 'personal'].includes(scope) || d.scope === scope).reverse(), scope, today: todayJalali() })
  }

  async edit({ view, params, response, session }: HttpContext) {
    const st = await loadState()
    const d = st.divs.find((x) => x.id === Number(params.id))
    if (!d) {
      session.flash('error', 'مورد پیدا نشد.')
      return response.redirect('/dividends')
    }
    return view.render('pages/dividend_edit', { nav: 'div', st, d })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const v = await request.validateUsing(dividendValidator)
    const date = v.occurredOn ? parseJalali(v.occurredOn) : todayIso()
    const err = this.check(v.scope, v.investorId, date)
    if (err) {
      session.flash('error', err)
      return response.redirect('/dividends')
    }
    await Dividend.create({
      scope: v.scope, investorId: v.scope === 'personal' ? v.investorId! : null,
      amount: Math.round(v.amount), occurredOn: date!, note: v.note ?? null, createdBy: auth.user!.id,
    })
    session.flash('ok', 'سود تقسیمی ثبت شد.')
    return response.redirect('/dividends')
  }

  async update({ request, params, response, session }: HttpContext) {
    const v = await request.validateUsing(dividendValidator)
    const row = await Dividend.find(Number(params.id))
    if (!row) {
      session.flash('error', 'مورد پیدا نشد.')
      return response.redirect('/dividends')
    }
    const date = v.occurredOn ? parseJalali(v.occurredOn) : row.occurredOn
    const err = this.check(v.scope, v.investorId, date)
    if (err) {
      session.flash('error', err)
      return response.redirect(`/dividends/${params.id}/edit`)
    }
    row.merge({ scope: v.scope, investorId: v.scope === 'personal' ? v.investorId! : null, amount: Math.round(v.amount), occurredOn: date!, note: v.note ?? null })
    await row.save()
    session.flash('ok', 'ویرایش شد.')
    return response.redirect('/dividends')
  }

  async destroy({ params, response, session }: HttpContext) {
    const row = await Dividend.find(Number(params.id))
    if (row) await row.delete()
    session.flash('ok', 'حذف شد.')
    return response.redirect('/dividends')
  }

  private check(scope: string, investorId: number | undefined, date: string | null) {
    if (!date) return 'تاریخ شمسی معتبر نیست (مثال: ۱۴۰۵/۰۷/۲۱).'
    if (scope === 'personal' && !investorId) return 'برای حساب شخصی، سرمایه‌گذار را انتخاب کنید.'
    return null
  }
}
