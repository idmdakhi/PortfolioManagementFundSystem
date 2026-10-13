import type { HttpContext } from '@adonisjs/core/http'
import Investor from '#models/investor'
import PersonalAccount from '#models/personal_account'
import { loadState } from '#services/fund_state'
import { investorValidator, personalValidator } from '#validators/fund'

export default class InvestorsController {
  async index({ view }: HttpContext) {
    return view.render('pages/investors/index', { nav: 'inv', st: await loadState() })
  }

  async show({ view, params, response, session }: HttpContext) {
    const st = await loadState()
    const row = st.rows.find((r) => r.id === Number(params.id))
    if (!row) {
      session.flash('error', 'سرمایه‌گذار پیدا نشد.')
      return response.redirect('/investors')
    }
    const txs = st.txs.filter((t) => t.investorId === row.id).reverse()
    return view.render('pages/investors/show', { nav: 'inv', st, row, txs })
  }

  async store({ request, response, session }: HttpContext) {
    const d = await request.validateUsing(investorValidator)
    await Investor.create({
      name: d.name,
      notes: d.notes ?? null,
      openingUnits: d.openingUnits ?? 0,
      openingCost: d.openingCost ?? 0,
    })
    session.flash('ok', 'سرمایه‌گذار اضافه شد.')
    return response.redirect('/investors')
  }

  async personal({ request, params, response, session }: HttpContext) {
    const d = await request.validateUsing(personalValidator)
    await PersonalAccount.updateOrCreate({ investorId: Number(params.id) }, d)
    session.flash('ok', 'حساب شخصی ذخیره شد.')
    return response.redirect(`/investors/${params.id}`)
  }
}
