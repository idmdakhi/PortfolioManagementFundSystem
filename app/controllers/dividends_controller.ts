import type { HttpContext } from '@adonisjs/core/http'
import Dividend from '#models/dividend'
import { loadState } from '#services/fund_state'
import { parseJalali, todayIso, todayJalali } from '#services/jalali'
import { dividendValidator } from '#validators/fund'
import { canEdit, NOT_EDITABLE } from '#services/period_guard'
import { audit } from '#services/audit'

/** Fund dividends and personal-account dividends live on separate pages. */
const homeOf = (scope: string) => (scope === 'personal' ? '/personal/dividends' : '/dividends')

export default class DividendsController {
  async index(ctx: HttpContext) {
    return this.list(ctx, 'fund')
  }

  async personalIndex(ctx: HttpContext) {
    return this.list(ctx, 'personal')
  }

  private async list({ view }: HttpContext, scope: 'fund' | 'personal') {
    const st = await loadState()
    const names = new Map(st.investors.map((i) => [i.id, i.name]))
    const list = st.divs.filter((d) => d.scope === scope).reverse().map((d) => ({ ...d, locked: !canEdit(st, d.occurredOn) }))
    return view.render('pages/dividends', { nav: scope === 'personal' ? 'psd' : 'div', st, names, list, scope, base: homeOf(scope), today: todayJalali() })
  }

  async edit({ view, params, response, session }: HttpContext) {
    const st = await loadState()
    const d = st.divs.find((x) => x.id === Number(params.id))
    if (d && !canEdit(st, d.occurredOn)) {
      session.flash('error', NOT_EDITABLE)
      return response.redirect(homeOf(d.scope))
    }
    if (!d) {
      session.flash('error', 'مورد پیدا نشد.')
      return response.redirect('/dividends')
    }
    return view.render('pages/dividend_edit', { nav: d.scope === 'personal' ? 'psd' : 'div', st, d, base: homeOf(d.scope) })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const v = await request.validateUsing(dividendValidator)
    const date = v.occurredOn ? parseJalali(v.occurredOn) : todayIso()
    const st = await loadState()
    const err = this.check(v.scope, v.investorId, date) ?? (canEdit(st, date!) ? null : NOT_EDITABLE)
    if (err) {
      session.flash('error', err)
      return response.redirect(homeOf(v.scope))
    }
    const created = await Dividend.create({
      scope: v.scope, investorId: v.scope === 'personal' ? v.investorId! : null,
      amount: Math.round(v.amount), occurredOn: date!, note: v.note ?? null, createdBy: auth.user!.id,
    })
    await audit.change({ auth, request }, { action: 'dividend.create', entity: 'dividend', entityId: created.id, after: created.serialize() })
    session.flash('ok', 'سود تقسیمی ثبت شد.')
    return response.redirect(homeOf(v.scope))
  }

  async update({ request, params, response, session, auth }: HttpContext) {
    const v = await request.validateUsing(dividendValidator)
    const st = await loadState()
    const row = await Dividend.find(Number(params.id))
    if (!row) {
      session.flash('error', 'مورد پیدا نشد.')
      return response.redirect('/dividends')
    }
    const date = v.occurredOn ? parseJalali(v.occurredOn) : row.occurredOn
    // A dividend never moves between the fund and a personal account: the saved scope stays.
    v.scope = row.scope as 'fund' | 'personal'
    const err =
      this.check(v.scope, v.investorId, date) ??
      (canEdit(st, row.occurredOn) && canEdit(st, date!) ? null : NOT_EDITABLE)
    if (err) {
      session.flash('error', err)
      return response.redirect(`/dividends/${params.id}/edit`)
    }
    const before = row.serialize()
    row.merge({ scope: v.scope, investorId: v.scope === 'personal' ? v.investorId! : null, amount: Math.round(v.amount), occurredOn: date!, note: v.note ?? null })
    await row.save()
    await audit.change({ auth, request }, { action: 'dividend.update', entity: 'dividend', entityId: row.id, before, after: row.serialize() })
    session.flash('ok', 'ویرایش شد.')
    return response.redirect(homeOf(row.scope))
  }

  async destroy({ params, request, response, session, auth }: HttpContext) {
    const st = await loadState()
    const row = await Dividend.find(Number(params.id))
    const home = homeOf(row?.scope ?? 'fund')
    if (row && !canEdit(st, row.occurredOn)) {
      session.flash('error', NOT_EDITABLE)
      return response.redirect(home)
    }
    if (row) {
      const before = row.serialize()
      await row.delete()
      await audit.change({ auth, request }, { action: 'dividend.delete', entity: 'dividend', entityId: before.id, before })
    }
    session.flash('ok', 'حذف شد.')
    return response.redirect(home)
  }

  private check(scope: string, investorId: number | undefined, date: string | null) {
    if (!date) return 'تاریخ شمسی معتبر نیست (مثال: ۱۴۰۵/۰۷/۲۱).'
    if (scope === 'personal' && !investorId) return 'برای حساب شخصی، سرمایه‌گذار را انتخاب کنید.'
    return null
  }
}
