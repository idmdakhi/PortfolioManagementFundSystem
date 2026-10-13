import type { HttpContext } from '@adonisjs/core/http'
import Transaction from '#models/transaction'
import { loadState, ledgerOk, type LedgerTx, type State } from '#services/fund_state'
import { parseJalali, todayIso, todayJalali } from '#services/jalali'
import { transactionValidator } from '#validators/fund'

/** Dates must fall inside the open period; closed periods are frozen. */
function openRange(st: State) {
  const p = st.current?.period
  return p && p.status === 'open' ? { start: p.startOn, end: p.endOn } : null
}

export default class TransactionsController {
  async index({ view }: HttpContext) {
    const st = await loadState()
    const names = new Map(st.investors.map((i) => [i.id, i.name]))
    const open = openRange(st)
    const txs = [...st.txs].reverse().map((t) => ({ ...t, locked: !open || t.occurredOn < open.start }))
    return view.render('pages/transactions', { nav: 'tx', st, names, txs, today: todayJalali() })
  }

  async edit({ view, params, response, session }: HttpContext) {
    const st = await loadState()
    const tx = st.txs.find((t) => t.id === Number(params.id))
    if (!tx) {
      session.flash('error', 'تراکنش پیدا نشد.')
      return response.redirect('/transactions')
    }
    return view.render('pages/transaction_edit', { nav: 'tx', st, tx })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const d = await request.validateUsing(transactionValidator)
    const st = await loadState()
    const open = openRange(st)
    const date = d.occurredOn ? parseJalali(d.occurredOn) : todayIso()
    const nav = d.nav ?? st.current?.summary.nav ?? 0
    const err = this.check(st, open, date, nav)
    if (err) return this.fail(session, response, err, '/transactions')
    const units = d.amount / nav
    const cand: LedgerTx = { id: 1e9, investorId: d.investorId, type: d.type, amount: Math.round(d.amount), nav, units, occurredOn: date!, note: null, batchId: null }
    if (!ledgerOk(st, [...st.txs, cand])) return this.fail(session, response, 'واحدهای کافی برای این ابطال در آن تاریخ وجود ندارد.', '/transactions')
    await Transaction.create({
      investorId: d.investorId, type: d.type, amount: Math.round(d.amount), nav, units,
      occurredOn: date!, note: d.note ?? null, createdBy: auth.user!.id,
    })
    session.flash('ok', 'تراکنش ثبت شد.')
    return response.redirect('/transactions')
  }

  async update({ request, params, response, session }: HttpContext) {
    const d = await request.validateUsing(transactionValidator)
    const st = await loadState()
    const old = st.txs.find((t) => t.id === Number(params.id))
    const back = `/transactions/${params.id}/edit`
    if (!old) return this.fail(session, response, 'تراکنش پیدا نشد.', '/transactions')
    if (old.batchId) return this.fail(session, response, 'این تراکنش بخشی از یک حرکت گروهی است؛ فقط کل گروه قابل حذف است.', '/transactions')
    const open = openRange(st)
    if (!open || old.occurredOn < open.start) return this.fail(session, response, 'این تراکنش در دورهٔ بسته است و قابل ویرایش نیست.', '/transactions')
    const date = d.occurredOn ? parseJalali(d.occurredOn) : old.occurredOn
    const nav = d.nav ?? old.nav
    const err = this.check(st, open, date, nav)
    if (err) return this.fail(session, response, err, back)
    const units = d.amount / nav
    const cand: LedgerTx = { id: old.id, investorId: d.investorId, type: d.type, amount: Math.round(d.amount), nav, units, occurredOn: date!, note: null, batchId: null }
    if (!ledgerOk(st, [...st.txs.filter((t) => t.id !== old.id), cand])) {
      return this.fail(session, response, 'با این تغییر، واحدهای یک سرمایه‌گذار منفی می‌شود.', back)
    }
    const row = await Transaction.findOrFail(old.id)
    row.merge({ investorId: d.investorId, type: d.type, amount: Math.round(d.amount), nav, units, occurredOn: date!, note: d.note ?? null })
    await row.save()
    session.flash('ok', 'تراکنش ویرایش شد.')
    return response.redirect('/transactions')
  }

  async destroy({ params, response, session }: HttpContext) {
    const st = await loadState()
    const old = st.txs.find((t) => t.id === Number(params.id))
    if (!old) return this.fail(session, response, 'تراکنش پیدا نشد.', '/transactions')
    if (old.batchId) return this.fail(session, response, 'این تراکنش بخشی از یک حرکت گروهی است؛ فقط کل گروه قابل حذف است.', '/transactions')
    const open = openRange(st)
    if (!open || old.occurredOn < open.start) return this.fail(session, response, 'این تراکنش در دورهٔ بسته است و قابل حذف نیست.', '/transactions')
    if (!ledgerOk(st, st.txs.filter((t) => t.id !== old.id))) {
      return this.fail(session, response, 'با حذف این تراکنش، واحدهای یک سرمایه‌گذار منفی می‌شود.', '/transactions')
    }
    await (await Transaction.findOrFail(old.id)).delete()
    session.flash('ok', 'تراکنش حذف شد.')
    return response.redirect('/transactions')
  }

  private check(st: State, open: { start: string; end: string } | null, date: string | null, nav: number) {
    if (!open) return 'دورهٔ مالی بازی وجود ندارد.'
    if (!date) return 'تاریخ شمسی معتبر نیست (مثال: ۱۴۰۵/۰۷/۲۱).'
    if (date < open.start || date > open.end) return 'تاریخ باید داخل دورهٔ مالی باز باشد. برای تاریخ‌های بعد، ابتدا دوره را ببندید.'
    if (!(nav > 0)) return 'NAV معتبر نیست.'
    void st
    return null
  }

  private fail(session: HttpContext['session'], response: HttpContext['response'], msg: string, to: string) {
    session.flash('error', msg)
    return response.redirect(to)
  }
}
