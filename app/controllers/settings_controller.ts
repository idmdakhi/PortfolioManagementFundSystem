import type { HttpContext } from '@adonisjs/core/http'
import { loadState } from '#services/fund_state'
import { parseJalali, todayJalali } from '#services/jalali'
import { settingsValidator } from '#validators/fund'
import Option from '#models/option'
import Valuation from '#models/valuation'
import { invalidateOptions, bankRate, closedEditsAllowed } from '#services/options'
import { syncLegacy, ensureLedger } from '#controllers/valuations_controller'

export default class SettingsController {
  async edit({ view }: HttpContext) {
    const st = await loadState()
    return view.render('pages/settings', { nav: 'set', st, rep: st.current, today: todayJalali(), bankRate: bankRate(), closedEdits: closedEditsAllowed() })
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
      await ensureLedger(current.period)
      const oldStart = current.period.startOn
      current.period.merge({ ...d, startOn, endOn })
      await current.period.save()
      // keep the period's opening entry in the valuation ledger in line with the edited begin value / start date
      const open = await Valuation.query().where('kind', 'open').where('occurred_on', oldStart).first()
      if (open) {
        open.occurredOn = startOn
        open.marketValue = Math.round(d.beginMarket)
        await open.save()
      } else {
        await Valuation.create({ occurredOn: startOn, marketValue: Math.round(d.beginMarket), kind: 'open', note: 'ارزش ابتدای دوره' })
      }
      await syncLegacy(current.period)
      session.flash('ok', 'تنظیمات ذخیره شد.')
    }
    return response.redirect('/settings')
  }

  /** Bank interest = fixed rate for customers and the fund. Applies to the open period and to new periods. */
  async bankRate({ request, response, session }: HttpContext) {
    const rate = Number(request.input('rate'))
    const { current } = await loadState()
    if (!(rate >= 0 && rate <= 1000)) {
      session.flash('error', 'درصد معتبر نیست.')
      return response.redirect('/settings')
    }
    const opt =
      (await Option.query().where('list', 'setting').where('value', 'bank_rate').first()) ??
      new Option().merge({ list: 'setting', value: 'bank_rate', label: 'سود بانکی (سود ثابت مشتری و صندوق)، درصد سالانه', active: true, builtin: true, sort: 98 })
    opt.extra = JSON.stringify({ rate })
    await opt.save()
    invalidateOptions()
    if (current && current.period.status === 'open') {
      current.period.fixedRate = rate
      await current.period.save()
    }
    session.flash('ok', 'سود بانکی (سود ثابت مشتری و صندوق) به‌روز شد.')
    return response.redirect('/settings')
  }

  /** Admin switch: allow creating/editing/deleting data that belongs to closed periods. */
  async closedEdits({ request, response, session }: HttpContext) {
    const on = request.input('on') === 'on'
    const opt =
      (await Option.query().where('list', 'setting').where('value', 'allow_closed_edit').first()) ??
      new Option().merge({ list: 'setting', value: 'allow_closed_edit', label: 'اجازهٔ ویرایش دوره‌های بسته', active: true, builtin: true, sort: 97 })
    opt.extra = JSON.stringify({ on })
    await opt.save()
    invalidateOptions()
    session.flash('ok', on ? 'ویرایش دوره‌های بسته روشن شد.' : 'ویرایش دوره‌های بسته خاموش شد.')
    return response.redirect('/settings')
  }
}
