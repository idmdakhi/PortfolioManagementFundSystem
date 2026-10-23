import type { HttpContext } from '@adonisjs/core/http'
import { loadState } from '#services/fund_state'
import { parseJalali, todayJalali, todayIso } from '#services/jalali'
import { settingsValidator } from '#validators/fund'
import Option from '#models/option'
import Valuation from '#models/valuation'
import { invalidateOptions, bankRate } from '#services/options'
import { syncLegacy, ensureLedger } from '#controllers/valuations_controller'
import { audit } from '#services/audit'
import { reconcile } from '#services/reconcile'
import { applyUnitSplit, splitFactor, TARGET_NAV } from '#services/unit_split'
import { exportAll } from '#services/backup'
import app from '@adonisjs/core/services/app'
import { mkdir, writeFile } from 'node:fs/promises'

export default class SettingsController {
  async edit({ view }: HttpContext) {
    const st = await loadState()
    return view.render('pages/settings', { nav: 'set', st, rep: st.current, today: todayJalali(), bankRate: bankRate(), rec: reconcile(st, todayIso()), fundNav: st.current?.summary.nav ?? 0, targetNav: TARGET_NAV, splitF: splitFactor(st.current?.summary.nav ?? 0, TARGET_NAV) })
  }

  async update({ request, response, session, auth }: HttpContext) {
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
      const before = current.period.serialize()
      current.period.merge({ ...d, startOn, endOn })
      await current.period.save()
      await audit.change({ auth, request }, { action: 'settings.update', entity: 'period', entityId: current.period.id, before, after: current.period.serialize() })
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
  async bankRate({ request, response, session, auth }: HttpContext) {
    const rate = Number(request.input('rate'))
    const { current } = await loadState()
    if (!(rate >= 0 && rate <= 1000)) {
      session.flash('error', 'درصد معتبر نیست.')
      return response.redirect('/settings')
    }
    const opt =
      (await Option.query().where('list', 'setting').where('value', 'bank_rate').first()) ??
      new Option().merge({ list: 'setting', value: 'bank_rate', label: 'سود بانکی (سود ثابت مشتری و صندوق)، درصد سالانه', active: true, builtin: true, sort: 98 })
    const previousRate = bankRate()
    opt.extra = JSON.stringify({ rate })
    await opt.save()
    await audit.change({ auth, request }, { action: 'settings.bank_rate', entity: 'option', entityId: 'bank_rate', before: { rate: previousRate }, after: { rate } })
    invalidateOptions()
    if (current && current.period.status === 'open') {
      current.period.fixedRate = rate
      await current.period.save()
    }
    session.flash('ok', 'سود بانکی (سود ثابت مشتری و صندوق) به‌روز شد.')
    return response.redirect('/settings')
  }

  /** Unit split: gives every holder `NAV / target` times the units so the NAV becomes `target` (default 1,000). */
  async split({ request, response, session, auth }: HttpContext) {
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/settings')
    }
    const st = await loadState()
    const target = Number(String(request.input('target') || TARGET_NAV).replace(/[,٬\s]/g, ''))
    if (!st.current || st.current.period.status !== 'open') return fail('دورهٔ بازی وجود ندارد.')
    if (request.input('confirm') !== 'on') return fail('برای تقسیم واحد، تأیید را بزنید.')
    if (!(target > 0 && target <= 1e9)) return fail('NAV هدف معتبر نیست.')
    const navBefore = st.current.summary.nav
    const factor = splitFactor(navBefore, target)
    if (!factor) return fail(navBefore > 0 ? 'NAV همین حالا برابر مقدار هدف است؛ نیازی به تقسیم نیست.' : 'NAV معتبر نیست (واحدی در صندوق نیست).')
    // Safety net like the restore: keep a full copy of the current data before touching units.
    const dir = app.tmpPath('backups')
    await mkdir(dir, { recursive: true })
    const snap = `pre-split-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    await writeFile(`${dir}/${snap}`, JSON.stringify(await exportAll(), null, 2))
    const counts = await applyUnitSplit(factor)
    const navAfter = (await loadState()).current?.summary.nav ?? 0
    await audit.change(
      { auth, request },
      { action: 'fund.unit_split', entity: 'fund', entityId: null, before: { nav: navBefore, savedAs: `tmp/backups/${snap}` }, after: { nav: navAfter, factor, target, ...counts } }
    )
    session.flash('ok', `واحدها در ضریب ${factor.toLocaleString('fa-IR', { maximumFractionDigits: 6 })} تقسیم شد؛ NAV از ${Math.round(navBefore).toLocaleString('fa-IR')} به ${Math.round(navAfter).toLocaleString('fa-IR')} رسید. نسخهٔ قبلی در tmp/backups/${snap} ذخیره شد.`)
    return response.redirect('/settings')
  }
}
