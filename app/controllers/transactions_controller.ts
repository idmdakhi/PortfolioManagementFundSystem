import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Transaction from '#models/transaction'
import { loadState } from '#services/fund_state'
import { transactionValidator } from '#validators/fund'

export default class TransactionsController {
  async index({ view }: HttpContext) {
    const st = await loadState()
    const names = new Map(st.rows.map((r) => [r.id, r.name]))
    return view.render('pages/transactions', { nav: 'tx', st, names, txs: [...st.txs].reverse() })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const d = await request.validateUsing(transactionValidator)
    const st = await loadState()
    const row = st.rows.find((r) => r.id === d.investorId)
    const nav = st.summary.nav
    if (!row || !(nav > 0)) {
      session.flash('error', 'سرمایه‌گذار یا NAV معتبر نیست.')
      return response.redirect('/transactions')
    }
    const units = d.amount / nav
    if (d.type === 'redeem' && units > row.units + 1e-9) {
      session.flash('error', 'واحدهای این سرمایه‌گذار برای این ابطال کافی نیست.')
      return response.redirect('/transactions')
    }
    await Transaction.create({
      investorId: row.id,
      type: d.type,
      amount: Math.round(d.amount),
      nav,
      units,
      occurredOn: d.occurredOn || DateTime.now().toISODate()!,
      note: d.note ?? null,
      createdBy: auth.user!.id,
    })
    session.flash('ok', 'تراکنش ثبت شد.')
    return response.redirect('/transactions')
  }
}
