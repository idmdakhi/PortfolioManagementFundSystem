import type { HttpContext } from '@adonisjs/core/http'
import { loadState } from '#services/fund_state'
import { settingsValidator, valuationValidator } from '#validators/fund'

export default class SettingsController {
  async edit({ view }: HttpContext) {
    return view.render('pages/settings', { nav: 'set', st: await loadState() })
  }

  async update({ request, response, session }: HttpContext) {
    const d = await request.validateUsing(settingsValidator)
    const { period } = await loadState()
    period.merge(d)
    await period.save()
    session.flash('ok', 'تنظیمات ذخیره شد.')
    return response.redirect('/settings')
  }

  /** Sets the market value of the whole portfolio as of now (all recorded transactions included). */
  async valuation({ request, response, session }: HttpContext) {
    const d = await request.validateUsing(valuationValidator)
    const { period, lastTxId } = await loadState()
    period.marketValueBase = Math.round(d.marketValue)
    period.valuationTxId = lastTxId
    await period.save()
    session.flash('ok', 'ارزش روز سبد به‌روز شد.')
    return response.redirect('/settings')
  }
}
