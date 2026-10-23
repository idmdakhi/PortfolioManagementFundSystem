import type { HttpContext } from '@adonisjs/core/http'
import Transaction from '#models/transaction'
import { loadState, ledgerOk, type LedgerTx } from '#services/fund_state'
import { parseJalali, todayIso, todayJalali } from '#services/jalali'
import { transactionValidator } from '#validators/fund'
import { canEdit, reportOf, NOT_EDITABLE } from '#services/period_guard'
import { audit } from '#services/audit'
import { toCsv } from '#services/csv'
import { toJalaliStr } from '#services/jalali'

export default class TransactionsController {
  async index({ view }: HttpContext) {
    const st = await loadState()
    const names = new Map(st.investors.map((i) => [i.id, i.name]))
    const txs = [...st.txs].reverse().map((t) => ({ ...t, locked: !canEdit(st, t.occurredOn) }))
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

  /** Whole ledger as CSV for Excel (open to every signed-in user, like the page itself). */
  async export({ response }: HttpContext) {
    const st = await loadState()
    const names = new Map(st.investors.map((i) => [i.id, i.name]))
    const rows: (string | number)[][] = [['شناسه', 'تاریخ شمسی', 'تاریخ میلادی', 'سرمایه‌گذار', 'نوع', 'ماهیت', 'مبلغ (ریال)', 'NAV', 'واحد', 'شناسه گروه', 'توضیح']]
    for (const t of st.txs) {
      rows.push([
        t.id, toJalaliStr(t.occurredOn), t.occurredOn, names.get(t.investorId) ?? '', t.type === 'issue' ? 'صدور' : 'ابطال',
        t.kind === 'fee' ? 'کارمزد (صدور واحد)' : 'عادی', t.amount, t.nav, t.units, t.batchId ?? '', t.note ?? '',
      ])
    }
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="ledger-${todayIso()}.csv"`)
    return response.send(toCsv(rows))
  }

  async store({ request, response, session, auth }: HttpContext) {
    const d = await request.validateUsing(transactionValidator)
    const st = await loadState()
    const date = d.occurredOn ? parseJalali(d.occurredOn) : todayIso()
    if (!date) return this.fail(session, response, 'تاریخ شمسی معتبر نیست (مثال: ۱۴۰۵/۰۷/۲۱).', '/transactions')
    if (!canEdit(st, date)) return this.fail(session, response, NOT_EDITABLE, '/transactions')
    // default price: the NAV of the period the date falls in
    const nav = d.nav ?? reportOf(st, date)?.summary.nav ?? 0
    if (!(nav > 0)) return this.fail(session, response, 'NAV معتبر نیست.', '/transactions')
    const units = d.amount / nav
    const cand: LedgerTx = { id: 1e9, investorId: d.investorId, type: d.type, amount: Math.round(d.amount), nav, units, occurredOn: date, note: null, batchId: null, kind: 'normal' }
    if (!ledgerOk(st, [...st.txs, cand])) return this.fail(session, response, 'واحدهای کافی برای این ابطال در آن تاریخ وجود ندارد.', '/transactions')
    const created = await Transaction.create({
      investorId: d.investorId, type: d.type, amount: Math.round(d.amount), nav, units,
      occurredOn: date, note: d.note ?? null, createdBy: auth.user!.id,
    })
    await audit.change({ auth, request }, { action: 'transaction.create', entity: 'transaction', entityId: created.id, after: created.serialize() })
    session.flash('ok', 'تراکنش ثبت شد.')
    return response.redirect('/transactions')
  }

  async update({ request, params, response, session, auth }: HttpContext) {
    const d = await request.validateUsing(transactionValidator)
    const st = await loadState()
    const old = st.txs.find((t) => t.id === Number(params.id))
    const back = `/transactions/${params.id}/edit`
    if (!old) return this.fail(session, response, 'تراکنش پیدا نشد.', '/transactions')
    if (old.batchId) return this.fail(session, response, 'این تراکنش بخشی از یک حرکت گروهی است؛ فقط کل گروه قابل حذف است.', '/transactions')
    if (old.kind === 'fee') return this.fail(session, response, 'این تراکنش انتقال کارمزد است؛ از صفحهٔ «کارمزدها» حذف می‌شود.', '/transactions')
    if (!canEdit(st, old.occurredOn)) return this.fail(session, response, 'این تراکنش در دورهٔ بسته است و قفل شده.', '/transactions')
    const date = d.occurredOn ? parseJalali(d.occurredOn) : old.occurredOn
    if (!date) return this.fail(session, response, 'تاریخ شمسی معتبر نیست (مثال: ۱۴۰۵/۰۷/۲۱).', back)
    if (!canEdit(st, date)) return this.fail(session, response, NOT_EDITABLE, back)
    const nav = d.nav ?? old.nav
    if (!(nav > 0)) return this.fail(session, response, 'NAV معتبر نیست.', back)
    const units = d.amount / nav
    const cand: LedgerTx = { id: old.id, investorId: d.investorId, type: d.type, amount: Math.round(d.amount), nav, units, occurredOn: date, note: null, batchId: null, kind: 'normal' }
    if (!ledgerOk(st, [...st.txs.filter((t) => t.id !== old.id), cand])) {
      return this.fail(session, response, 'با این تغییر، واحدهای یک سرمایه‌گذار منفی می‌شود.', back)
    }
    const row = await Transaction.findOrFail(old.id)
    const before = row.serialize()
    row.merge({ investorId: d.investorId, type: d.type, amount: Math.round(d.amount), nav, units, occurredOn: date, note: d.note ?? null })
    await row.save()
    await audit.change({ auth, request }, { action: 'transaction.update', entity: 'transaction', entityId: row.id, before, after: row.serialize() })
    session.flash('ok', 'تراکنش ویرایش شد.')
    return response.redirect('/transactions')
  }

  async destroy({ params, request, response, session, auth }: HttpContext) {
    const st = await loadState()
    const old = st.txs.find((t) => t.id === Number(params.id))
    if (!old) return this.fail(session, response, 'تراکنش پیدا نشد.', '/transactions')
    if (old.batchId) return this.fail(session, response, 'این تراکنش بخشی از یک حرکت گروهی است؛ فقط کل گروه قابل حذف است.', '/transactions')
    if (old.kind === 'fee') return this.fail(session, response, 'این تراکنش انتقال کارمزد است؛ از صفحهٔ «کارمزدها» حذف می‌شود.', '/transactions')
    if (!canEdit(st, old.occurredOn)) return this.fail(session, response, 'این تراکنش در دورهٔ بسته است و قفل شده.', '/transactions')
    if (!ledgerOk(st, st.txs.filter((t) => t.id !== old.id))) {
      return this.fail(session, response, 'با حذف این تراکنش، واحدهای یک سرمایه‌گذار منفی می‌شود.', '/transactions')
    }
    const row = await Transaction.findOrFail(old.id)
    const before = row.serialize()
    await row.delete()
    await audit.change({ auth, request }, { action: 'transaction.delete', entity: 'transaction', entityId: old.id, before })
    session.flash('ok', 'تراکنش حذف شد.')
    return response.redirect('/transactions')
  }

  private fail(session: HttpContext['session'], response: HttpContext['response'], msg: string, to: string) {
    session.flash('error', msg)
    return response.redirect(to)
  }
}
