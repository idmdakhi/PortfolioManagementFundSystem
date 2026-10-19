import type { HttpContext } from '@adonisjs/core/http'
import Investor from '#models/investor'
import PersonalAccount from '#models/personal_account'
import db from '@adonisjs/lucid/services/db'
import { managerInvestorId } from '#services/options'
import { loadState } from '#services/fund_state'
import { faDigits, todayJalali } from '#services/jalali'
import { investorValidator, personalValidator } from '#validators/fund'
import { audit } from '#services/audit'
import { closedEditsAllowed } from '#services/options'

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

  async store({ request, response, session, auth }: HttpContext) {
    const d = await request.validateUsing(investorValidator)
    const inv = await Investor.create({
      name: d.name, notes: d.notes ?? null, openingUnits: d.openingUnits ?? 0, openingCost: d.openingCost ?? 0,
    })
    const { current } = await loadState()
    if (current) await PersonalAccount.create({ investorId: inv.id, periodId: current.period.id })
    await audit.change({ auth, request }, { action: 'investor.create', entity: 'investor', entityId: inv.id, after: inv.serialize() })
    session.flash('ok', 'سرمایه‌گذار اضافه شد.')
    return response.redirect('/investors')
  }

  async personal({ request, params, response, session, auth }: HttpContext) {
    const { periodId, ...d } = await request.validateUsing(personalValidator)
    const { reports } = await loadState()
    const period = reports.find((r) => r.period.id === periodId)?.period
    if (!period) {
      session.flash('error', 'دورهٔ انتخاب‌شده پیدا نشد.')
      return response.redirect(`/investors/${params.id}/personal`)
    }
    if (period.status === 'closed' && !closedEditsAllowed()) {
      session.flash('error', 'این دوره بسته است. برای ویرایش حساب شخصی آن، «ویرایش دوره‌های بسته» را در تنظیمات روشن کنید.')
      return response.redirect(`/investors/${params.id}/personal`)
    }
    const prev = await PersonalAccount.query().where('investor_id', Number(params.id)).where('period_id', periodId).first()
    const saved = await PersonalAccount.updateOrCreate({ investorId: Number(params.id), periodId }, d)
    await audit.change({ auth, request }, { action: 'personal.save', entity: 'personal_account', entityId: saved.id, before: prev?.serialize() ?? null, after: saved.serialize() })
    session.flash('ok', 'حساب شخصی ذخیره شد.')
    return response.redirect(`/investors/${params.id}/personal`)
  }

  async edit({ view, params, response, session }: HttpContext) {
    const inv = await Investor.find(Number(params.id))
    if (!inv) {
      session.flash('error', 'سرمایه‌گذار پیدا نشد.')
      return response.redirect('/investors')
    }
    return view.render('pages/investors/edit', { nav: 'inv', inv })
  }

  async update({ request, params, response, session, auth }: HttpContext) {
    const d = await request.validateUsing(investorValidator)
    const inv = await Investor.find(Number(params.id))
    if (!inv) {
      session.flash('error', 'سرمایه‌گذار پیدا نشد.')
      return response.redirect('/investors')
    }
    const before = inv.serialize()
    inv.merge({ name: d.name, notes: d.notes ?? null, openingUnits: d.openingUnits ?? 0, openingCost: d.openingCost ?? 0 })
    await inv.save()
    await audit.change({ auth, request }, { action: 'investor.update', entity: 'investor', entityId: inv.id, before, after: inv.serialize() })
    session.flash('ok', 'سرمایه‌گذار ویرایش شد.')
    return response.redirect('/investors')
  }

  /** Deletes an investor only when nothing else refers to him. */
  async destroy({ params, request, response, session, auth }: HttpContext) {
    const id = Number(params.id)
    const st = await loadState()
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect(`/investors/${id}/edit`)
    }
    const inv = st.investors.find((i) => i.id === id)
    if (!inv) return fail('سرمایه‌گذار پیدا نشد.')
    const reasons: string[] = []
    if (inv.openingUnits || inv.openingCost) reasons.push('واحد یا بهای اولیه دارد')
    if (st.txs.some((t) => t.investorId === id)) reasons.push('تراکنش دارد')
    if (st.divs.some((d) => d.investorId === id)) reasons.push('سود تقسیمی شخصی دارد')
    if (st.fees.some((f) => f.investorId === id)) reasons.push('کارمزد ثبت‌شده دارد')
    if (st.areaEntries.some((e) => e.investorId === id)) reasons.push('در حوزه‌ها سرمایه دارد')
    if (managerInvestorId() === id) reasons.push('سبدگردان انتخاب‌شده است')
    const hasPersonal = st.reports.some((r) => {
      const p = r.rows.find((x) => x.id === id)?.personalRaw
      return !!p && !!(p.beginValue || p.deposits || p.withdrawals || p.marketValue)
    })
    if (hasPersonal) reasons.push('حساب شخصی دارای مقدار دارد')
    if (reasons.length) return fail(`حذف ممکن نیست؛ این سرمایه‌گذار: ${reasons.join('، ')}.`)
    await db.transaction(async (trx) => {
      await trx.from('personal_accounts').where('investor_id', id).delete()
      await trx.from('investors').where('id', id).delete()
    })
    await audit.change({ auth, request }, { action: 'investor.delete', entity: 'investor', entityId: id, before: inv })
    session.flash('ok', 'سرمایه‌گذار حذف شد.')
    return response.redirect('/investors')
  }
}
