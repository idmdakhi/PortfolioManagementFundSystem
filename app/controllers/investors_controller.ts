import type { HttpContext } from '@adonisjs/core/http'
import Investor from '#models/investor'
import PersonalAccount from '#models/personal_account'
import { loadState } from '#services/fund_state'
import { faDigits, todayJalali } from '#services/jalali'
import { investorValidator, personalValidator } from '#validators/fund'

export default class InvestorsController {
  async index({ view }: HttpContext) {
    const st = await loadState()
    return view.render('pages/investors/index', { nav: 'inv', st, rep: st.current })
  }

  /** Fund account only. */
  async show({ view, params, response, session }: HttpContext) {
    const st = await loadState()
    const id = Number(params.id)
    const lines = st.reports.map((r) => ({ period: r.period, row: r.rows.find((x) => x.id === id) })).filter((l) => l.row)
    if (!lines.length) {
      session.flash('error', 'سرمایه‌گذار پیدا نشد.')
      return response.redirect('/investors')
    }
    const txs = st.txs.filter((t) => t.investorId === id).reverse()
    return view.render('pages/investors/show', { nav: 'inv', st, id, name: lines[0].row!.name, lines, txs })
  }

  /** Personal account only. */
  async personalShow({ view, params, response, session }: HttpContext) {
    const st = await loadState()
    const id = Number(params.id)
    const lines = st.reports.map((r) => ({ period: r.period, row: r.rows.find((x) => x.id === id) })).filter((l) => l.row)
    if (!lines.length) {
      session.flash('error', 'سرمایه‌گذار پیدا نشد.')
      return response.redirect('/investors')
    }
    const divs = st.divs.filter((d) => d.scope === 'personal' && d.investorId === id).reverse()
    return view.render('pages/investors/personal', { nav: 'ps', st, id, name: lines[0].row!.name, lines, divs })
  }

  /** Printable customer report: fund + personal account + areas, one period. */
  async report({ view, params, request, response, session }: HttpContext) {
    const st = await loadState()
    const id = Number(params.id)
    const pid = Number(request.input('p'))
    const rep = st.reports.find((r) => r.period.id === pid) ?? st.current
    const row = rep?.rows.find((x) => x.id === id)
    if (!rep || !row) {
      session.flash('error', 'سرمایه‌گذار پیدا نشد.')
      return response.redirect('/investors')
    }
    const inRange = (d: string) => d >= rep.period.startOn && d <= rep.period.endOn
    const txs = st.txs.filter((t) => t.investorId === id && inRange(t.occurredOn))
    const personalDivs = st.divs.filter((d) => d.scope === 'personal' && d.investorId === id && inRange(d.occurredOn))
    const areaRows = st.areas.map((a) => ({ area: a, row: a.rows.find((x) => x.investorId === id) })).filter((x) => x.row)
    const areaMoves = st.areaEntries.filter((e) => e.investorId === id && inRange(e.occurredOn))
    const areaNames = new Map(st.areas.map((a) => [a.id, a.name]))
    const history = st.reports.map((r) => {
      const x = r.rows.find((y) => y.id === id)!
      return { label: r.period.label, fundNet: x.fund.net, personalNet: x.personal ? x.personal.net : 0 }
    })
    const totalValue = row.fund.value + (row.personalRaw ? row.personalRaw.marketValue : 0) + areaRows.reduce((a, x) => a + x.row!.value, 0)
    const totalNet = row.fund.net + (row.personal ? row.personal.net : 0) + areaRows.reduce((a, x) => a + x.row!.profit, 0)
    return view.render('pages/investors/report', {
      nav: 'inv', st, rep, row, id, name: row.name, txs, personalDivs, areaRows, areaMoves, areaNames, history,
      totalValue, totalNet, todayFa: faDigits(todayJalali()),
    })
  }

  async store({ request, response, session }: HttpContext) {
    const d = await request.validateUsing(investorValidator)
    const inv = await Investor.create({
      name: d.name, notes: d.notes ?? null, openingUnits: d.openingUnits ?? 0, openingCost: d.openingCost ?? 0,
    })
    const { current } = await loadState()
    if (current) await PersonalAccount.create({ investorId: inv.id, periodId: current.period.id })
    session.flash('ok', 'سرمایه‌گذار اضافه شد.')
    return response.redirect('/investors')
  }

  async personal({ request, params, response, session }: HttpContext) {
    const { periodId, ...d } = await request.validateUsing(personalValidator)
    await PersonalAccount.updateOrCreate({ investorId: Number(params.id), periodId }, d)
    session.flash('ok', 'حساب شخصی ذخیره شد.')
    return response.redirect(`/investors/${params.id}/personal`)
  }
}
