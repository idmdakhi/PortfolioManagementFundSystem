import type { HttpContext } from '@adonisjs/core/http'
import { loadState } from '#services/fund_state'
import { parseJalali, todayIso, todayJalali } from '#services/jalali'
import { settingsValidator, valuationValidator } from '#validators/fund'

export default class SettingsController {
  async edit({ view }: HttpContext) {
    const st = await loadState()
    return view.render('pages/settings', { nav: 'set', st, rep: st.current, today: todayJalali() })
  }

  async update({ request, response, session }: HttpContext) {
    const { startJalali, endJalali, ...d } = await request.validateUsing(settingsValidator)
    const { current } = await loadState()
    const startOn = parseJalali(startJalali)
    const endOn = parseJalali(endJalali)
    if (!current || current.period.status !== 'open') {
      session.flash('error', 'دورهٔ بازی وجود ندارد.')
    } else if (!startOn || !endOn || startOn > endOn) {
      session.flash('error', 'تاریخ شروع و پایان شمسی معتبر نیست.')
    } else {
      current.period.merge({ ...d, startOn, endOn })
      await current.period.save()
      session.flash('ok', 'تنظیمات ذخیره شد.')
    }
    return response.redirect('/settings')
  }

  /** Sets the market value of the whole portfolio as of a date (transactions up to that day are included). */
  async valuation({ request, response, session }: HttpContext) {
    const d = await request.validateUsing(valuationValidator)
    const { current } = await loadState()
    const on = d.valuationOn ? parseJalali(d.valuationOn) : todayIso()
    if (!current || current.period.status !== 'open') {
      session.flash('error', 'دورهٔ بازی وجود ندارد.')
    } else if (!on) {
      session.flash('error', 'تاریخ شمسی معتبر نیست.')
    } else {
      current.period.marketValueBase = Math.round(d.marketValue)
      current.period.valuationOn = on
      await current.period.save()
      session.flash('ok', 'ارزش روز سبد به‌روز شد.')
    }
    return response.redirect('/settings')
  }
}
