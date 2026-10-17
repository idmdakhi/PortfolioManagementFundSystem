import type { HttpContext } from '@adonisjs/core/http'
import Period from '#models/period'
import PersonalAccount from '#models/personal_account'
import FeeReceipt from '#models/fee_receipt'
import Valuation from '#models/valuation'
import { bankRate } from '#services/options'
import db from '@adonisjs/lucid/services/db'
import { loadState } from '#services/fund_state'
import { addDays, jalaliYear, yearRange, parseJalali } from '#services/jalali'
import { periodEditValidator } from '#validators/fund'
import { syncLegacy, ensureLedger } from '#controllers/valuations_controller'

export default class PeriodsController {
  async index({ view }: HttpContext) {
    return view.render('pages/periods', { nav: 'pl', st: await loadState() })
  }

  /** Closes the open period and opens the next one, carrying values forward. */
  async close({ response, session }: HttpContext) {
    const st = await loadState()
    const rep = st.current
    if (!rep || rep.period.status !== 'open') {
      session.flash('error', 'دورهٔ بازی وجود ندارد.')
      return response.redirect('/settings')
    }
    const closing = rep.period
    // The fee of the closing period is settled (paid out), so the next period starts from the value after fee.
    const feeLeft = Math.max(0, Math.round(rep.summary.feeRemaining))
    const mv = Math.round(rep.params.marketValue) - feeLeft
    const start = addDays(closing.endOn, 1)
    const range = yearRange(jalaliYear(start))
    await db.transaction(async (trx) => {
      closing.useTransaction(trx)
      closing.status = 'closed'
      closing.marketValueBase = Math.round(rep.params.marketValue)
      closing.valuationOn = closing.endOn
      await closing.save()
      if (feeLeft > 0) {
        await FeeReceipt.create(
          { scope: 'fund', investorId: null, amount: feeLeft, occurredOn: closing.endOn, method: 'settle', note: 'تسویهٔ خودکار هنگام بستن دوره' },
          { client: trx }
        )
      }
      const next = await Period.create(
        {
          label: String(jalaliYear(start)), startOn: start, endOn: range.end, status: 'open', months: 12,
          beginMarket: mv, openingDeposits: 0, openingWithdrawals: 0, marketValueBase: mv,
          valuationOn: closing.endOn, fixedRate: bankRate() ?? closing.fixedRate, mgmtRate: closing.mgmtRate,
          excessRate: closing.excessRate, feeCap: closing.feeCap, discount: 0,
          mgmtRate2: closing.mgmtRate2, excessRate2: closing.excessRate2,
        },
        { client: trx }
      )
      await Valuation.createMany(
        [
          { occurredOn: closing.endOn, marketValue: Math.round(rep.params.marketValue), kind: 'close', note: 'ارزش پایانی دوره' },
          { occurredOn: start, marketValue: mv, kind: 'open', note: 'ارزش ابتدای دوره (پس از تسویهٔ کارمزد)' },
        ],
        { client: trx }
      )
      for (const row of rep.rows) {
        if (!row.personalRaw || !row.personal) continue
        const carry = row.personalRaw.marketValue - Math.round(row.personal.fee)
        await PersonalAccount.create(
          { investorId: row.id, periodId: next.id, beginValue: carry, deposits: 0, withdrawals: 0, marketValue: carry },
          { client: trx }
        )
      }
    })
    session.flash('ok', 'دوره بسته شد و دورهٔ جدید باز شد. ارزش روز را به‌روز کنید.')
    return response.redirect('/settings')
  }

  /** What is attached to a period (used to decide whether it can be deleted). */
  private usage(st: Awaited<ReturnType<typeof loadState>>, p: Period) {
    const inR = (d: string) => d >= p.startOn && d <= p.endOn
    return {
      txs: st.txs.filter((t) => inR(t.occurredOn)).length,
      divs: st.divs.filter((d) => inR(d.occurredOn)).length,
      fees: st.fees.filter((f) => inR(f.occurredOn)).length,
      vals: st.valuations.filter((v) => inR(v.occurredOn) && v.kind === 'value').length,
    }
  }

  async manage({ view }: HttpContext) {
    const st = await loadState()
    const rows = st.reports.map((r, i) => {
      const u = this.usage(st, r.period)
      const reasons: string[] = []
      if (r.period.status === 'open') reasons.push('دورهٔ باز است')
      if (st.reports.length < 2) reasons.push('تنها دوره است')
      if (u.txs) reasons.push(`${u.txs} تراکنش`)
      if (u.divs) reasons.push(`${u.divs} سود تقسیمی`)
      if (u.fees) reasons.push(`${u.fees} کارمزد ثبت‌شده`)
      if (u.vals) reasons.push(`${u.vals} ارزش‌گذاری`)
      return { r, hasNext: i < st.reports.length - 1, reasons }
    })
    return view.render('pages/periods_manage', { nav: 'pl', st, rows })
  }

  async edit({ view, params, response, session }: HttpContext) {
    const st = await loadState()
    const rep = st.reports.find((r) => r.period.id === Number(params.id))
    if (!rep) {
      session.flash('error', 'دوره پیدا نشد.')
      return response.redirect('/periods/manage')
    }
    return view.render('pages/period_edit', { nav: 'pl', st, rep })
  }

  async update({ request, params, response, session }: HttpContext) {
    const { closeValue, startJalali, endJalali, ...d } = await request.validateUsing(periodEditValidator)
    const st = await loadState()
    const rep = st.reports.find((r) => r.period.id === Number(params.id))
    const back = `/periods/${params.id}/edit`
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect(back)
    }
    if (!rep) return fail('دوره پیدا نشد.')
    const startOn = parseJalali(startJalali)
    const endOn = parseJalali(endJalali)
    if (!startOn || !endOn || startOn > endOn) return fail('تاریخ شروع و پایان شمسی معتبر نیست.')
    if (st.reports.some((o) => o.period.id !== rep.period.id && startOn <= o.period.endOn && endOn >= o.period.startOn)) {
      return fail('بازهٔ این دوره با دورهٔ دیگری هم‌پوشانی دارد.')
    }
    const period = await Period.findOrFail(rep.period.id)
    await ensureLedger(period)
    const oldStart = period.startOn
    const oldEnd = period.endOn
    period.merge({ ...d, startOn, endOn })
    await period.save()
    // keep the ledger's opening / closing entries in line with the edited values
    const openE = await Valuation.query().where('kind', 'open').where('occurred_on', oldStart).first()
    if (openE) {
      openE.occurredOn = startOn
      openE.marketValue = Math.round(d.beginMarket)
      await openE.save()
    }
    if (period.status === 'closed') {
      const closeE = await Valuation.query().where('kind', 'close').where('occurred_on', oldEnd).first()
      const value = closeValue !== undefined ? Math.round(closeValue) : closeE ? Number(closeE.marketValue) : Math.round(Number(period.marketValueBase))
      if (closeE) {
        closeE.occurredOn = endOn
        closeE.marketValue = value
        await closeE.save()
      } else {
        await Valuation.create({ occurredOn: endOn, marketValue: value, kind: 'close', note: 'ارزش پایانی دوره' })
      }
    }
    await syncLegacy(await Period.findOrFail(period.id))
    session.flash('ok', 'دوره ویرایش شد. اگر دورهٔ بعدی وجود دارد، با «به‌روزرسانی ارزش ابتدای دورهٔ بعد» آن را هماهنگ کنید.')
    return response.redirect('/periods/manage')
  }

  async destroy({ params, response, session }: HttpContext) {
    const st = await loadState()
    const rep = st.reports.find((r) => r.period.id === Number(params.id))
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/periods/manage')
    }
    if (!rep) return fail('دوره پیدا نشد.')
    const u = this.usage(st, rep.period)
    if (rep.period.status === 'open') return fail('دورهٔ باز حذف نمی‌شود.')
    if (st.reports.length < 2) return fail('تنها دوره حذف نمی‌شود.')
    if (u.txs || u.divs || u.fees || u.vals) return fail('این دوره داده دارد (تراکنش، سود تقسیمی، کارمزد یا ارزش‌گذاری). ابتدا آن‌ها را حذف کنید.')
    await db.transaction(async (trx) => {
      await trx.from('valuations').where('occurred_on', '>=', rep.period.startOn).where('occurred_on', '<=', rep.period.endOn).delete()
      await trx.from('personal_accounts').where('period_id', rep.period.id).delete()
      await trx.from('periods').where('id', rep.period.id).delete()
    })
    session.flash('ok', 'دوره حذف شد.')
    return response.redirect('/periods/manage')
  }

  /** Re-derives the next period's opening values from this period's (edited) closing values. */
  async carry({ params, response, session }: HttpContext) {
    const st = await loadState()
    const idx = st.reports.findIndex((r) => r.period.id === Number(params.id))
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/periods/manage')
    }
    if (idx < 0 || idx >= st.reports.length - 1) return fail('دورهٔ بعدی وجود ندارد.')
    const rep = st.reports[idx]
    const next = await Period.findOrFail(st.reports[idx + 1].period.id)
    const feeLeft = Math.max(0, Math.round(rep.summary.feeRemaining))
    const mv = Math.round(rep.params.marketValue) - feeLeft
    await ensureLedger(next)
    next.beginMarket = mv
    await next.save()
    const openE = await Valuation.query().where('kind', 'open').where('occurred_on', next.startOn).first()
    if (openE) {
      openE.marketValue = mv
      await openE.save()
    }
    await syncLegacy(await Period.findOrFail(next.id))
    for (const row of rep.rows) {
      if (!row.personalRaw || !row.personal) continue
      const nrow = await PersonalAccount.query().where('investor_id', row.id).where('period_id', next.id).first()
      if (!nrow) continue
      const untouched = !Number(nrow.deposits) && !Number(nrow.withdrawals) && Number(nrow.marketValue) === Number(nrow.beginValue)
      const carry = row.personalRaw.marketValue - Math.round(row.personal.fee)
      nrow.beginValue = carry
      if (untouched) nrow.marketValue = carry
      await nrow.save()
    }
    session.flash('ok', `ارزش ابتدای دورهٔ ${next.label} از روی دورهٔ ${rep.period.label} به‌روز شد.`)
    return response.redirect('/periods/manage')
  }
}
