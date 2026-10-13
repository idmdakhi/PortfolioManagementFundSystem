import type { HttpContext } from '@adonisjs/core/http'
import Period from '#models/period'
import PersonalAccount from '#models/personal_account'
import db from '@adonisjs/lucid/services/db'
import { loadState } from '#services/fund_state'
import { addDays, jalaliYear, yearRange } from '#services/jalali'

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
    const mv = Math.round(rep.params.marketValue) - rep.summary.fee
    const start = addDays(closing.endOn, 1)
    const range = yearRange(jalaliYear(start))
    await db.transaction(async (trx) => {
      closing.useTransaction(trx)
      closing.status = 'closed'
      closing.marketValueBase = Math.round(rep.params.marketValue)
      await closing.save()
      const next = await Period.create(
        {
          label: String(jalaliYear(start)), startOn: start, endOn: range.end, status: 'open', months: 12,
          beginMarket: mv, openingDeposits: 0, openingWithdrawals: 0, marketValueBase: mv,
          valuationOn: closing.endOn, fixedRate: closing.fixedRate, mgmtRate: closing.mgmtRate,
          excessRate: closing.excessRate, feeCap: closing.feeCap, discount: 0,
          mgmtRate2: closing.mgmtRate2, excessRate2: closing.excessRate2,
        },
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
}
