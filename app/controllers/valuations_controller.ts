import type { HttpContext } from '@adonisjs/core/http'
import Period from '#models/period'
import Valuation from '#models/valuation'
import { loadState } from '#services/fund_state'
import { baseline, type Val } from '#services/valuation'
import { parseJalali, todayIso, todayJalali } from '#services/jalali'
import { canEdit, reportOf, NOT_EDITABLE } from '#services/period_guard'
import { audit } from '#services/audit'

/** Keeps the stored legacy columns in line with the ledger (so older backups/tools still read a valid value). */
export async function syncLegacy(period: Period) {
  const rows = await Valuation.query()
  const vals: Val[] = rows.map((v) => ({ id: v.id, occurredOn: v.occurredOn, marketValue: Number(v.marketValue), kind: v.kind as Val['kind'] }))
  const b = baseline(
    { startOn: period.startOn, endOn: period.endOn, marketValueBase: Number(period.marketValueBase), valuationOn: period.valuationOn },
    vals
  )
  if (b.source === 'ledger') {
    period.marketValueBase = b.value
    period.valuationOn = b.effDate
    await period.save()
  }
}

/** Makes sure a period has ledger entries (older data only has the stored legacy values). */
export async function ensureLedger(period: Period) {
  const inRange = await Valuation.query().where('occurred_on', '>=', period.startOn).where('occurred_on', '<=', period.endOn)
  if (inRange.length) return
  await Valuation.create({ occurredOn: period.startOn, marketValue: Math.round(Number(period.beginMarket)), kind: 'open', note: 'ارزش ابتدای دوره' })
  if (period.status === 'closed') {
    await Valuation.create({ occurredOn: period.endOn, marketValue: Math.round(Number(period.marketValueBase)), kind: 'close', note: 'ارزش پایانی دوره' })
  } else if (period.valuationOn >= period.startOn && period.valuationOn <= period.endOn) {
    await Valuation.create({ occurredOn: period.valuationOn, marketValue: Math.round(Number(period.marketValueBase)), kind: 'value', note: 'آخرین ارزش‌گذاری' })
  }
}

export default class ValuationsController {
  /** Valuation ledger + a combined, dated journal of everything that happened to the fund. */
  async index({ view, request }: HttpContext) {
    const st = await loadState()
    const names = new Map(st.investors.map((i) => [i.id, i.name]))
    const type = String(request.input('t', ''))
    type Ev = { date: string; order: number; type: string; title: string; amount: number | null; note: string | null; valId: number | null; deletable: boolean }
    const ev: Ev[] = []
    for (const v of st.valuations) {
      const locked = !canEdit(st, v.occurredOn) || v.kind !== 'value'
      ev.push({
        date: v.occurredOn, order: v.id, type: 'valuation',
        title: v.kind === 'open' ? 'ارزش ابتدای دوره' : v.kind === 'close' ? 'ارزش پایانی دوره' : 'ارزش‌گذاری صندوق',
        amount: v.marketValue, note: v.note, valId: v.id, deletable: !locked,
      })
    }
    for (const d of st.divs.filter((x) => x.scope === 'fund')) {
      ev.push({ date: d.occurredOn, order: d.id, type: 'dividend', title: 'سود نقدی صندوق', amount: d.amount, note: d.note, valId: null, deletable: false })
    }
    for (const t of st.txs) {
      ev.push({
        date: t.occurredOn, order: t.id, type: 'tx',
        title: `${t.kind === 'fee' ? 'انتقال کارمزد (صدور واحد)' : t.type === 'issue' ? 'صدور واحد' : 'ابطال واحد'} — ${names.get(t.investorId) ?? ''}`,
        amount: t.amount, note: t.note, valId: null, deletable: false,
      })
    }
    for (const f of st.fees.filter((x) => x.scope === 'fund')) {
      ev.push({ date: f.occurredOn, order: f.id, type: 'fee', title: 'کارمزد دریافتی صندوق', amount: f.amount, note: f.note, valId: null, deletable: false })
    }
    const list = ev
      .filter((e) => !type || e.type === type)
      .sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order)
    return view.render('pages/valuations', { nav: 'val', st, list, type, today: todayJalali() })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const b = request.all()
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/valuations')
    }
    const st = await loadState()
    const raw = String(b.marketValue ?? '').trim()
    const value = Math.round(Number(raw))
    if (raw === '' || !(value >= 0)) return fail('ارزش روز را وارد کنید.')
    const date = b.occurredOn ? parseJalali(String(b.occurredOn)) : todayIso()
    if (!date) return fail('تاریخ شمسی معتبر نیست (مثال: ۱۴۰۵/۰۷/۲۱).')
    const rep = reportOf(st, date)
    if (!rep || !canEdit(st, date)) return fail(NOT_EDITABLE)
    const period = rep.period
    const created = await Valuation.create({
      occurredOn: date, marketValue: value, kind: 'value', note: String(b.note || '').trim() || null, createdBy: auth.user!.id,
    })
    await audit.change({ auth, request }, { action: 'valuation.create', entity: 'valuation', entityId: created.id, after: created.serialize() })
    const fresh = await Period.findOrFail(period.id)
    await syncLegacy(fresh)
    session.flash('ok', 'ارزش‌گذاری ثبت شد.')
    return response.redirect('/valuations')
  }

  async destroy({ params, request, response, session, auth }: HttpContext) {
    const st = await loadState()
    const v = st.valuations.find((x) => x.id === Number(params.id))
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/valuations')
    }
    if (!v) return fail('مورد پیدا نشد.')
    if (v.kind !== 'value') return fail('ارزش ابتدا و پایان دوره توسط خود برنامه مدیریت می‌شود.')
    if (!canEdit(st, v.occurredOn)) return fail('این ارزش‌گذاری در دورهٔ بسته است و قفل شده.')
    const owner = reportOf(st, v.occurredOn)!.period
    const gone = await Valuation.findOrFail(v.id)
    const before = gone.serialize()
    await gone.delete()
    await audit.change({ auth, request }, { action: 'valuation.delete', entity: 'valuation', entityId: v.id, before })
    await syncLegacy(await Period.findOrFail(owner.id))
    session.flash('ok', 'ارزش‌گذاری حذف شد.')
    return response.redirect('/valuations')
  }

  async edit({ view, params, response, session }: HttpContext) {
    const st = await loadState()
    const v = st.valuations.find((x) => x.id === Number(params.id))
    if (!v || v.kind !== 'value') {
      session.flash('error', 'فقط ارزش‌گذاری‌های میانی قابل ویرایش‌اند؛ ارزش ابتدا و پایان دوره را از «مدیریت دوره‌ها» ویرایش کنید.')
      return response.redirect('/valuations')
    }
    return view.render('pages/valuation_edit', { nav: 'val', st, v })
  }

  async update({ request, params, response, session, auth }: HttpContext) {
    const b = request.all()
    const st = await loadState()
    const v = st.valuations.find((x) => x.id === Number(params.id))
    const back = `/valuations/${params.id}/edit`
    const fail = (m: string, to = back) => {
      session.flash('error', m)
      return response.redirect(to)
    }
    if (!v || v.kind !== 'value') return fail('مورد پیدا نشد.', '/valuations')
    if (!canEdit(st, v.occurredOn)) return fail('این ارزش‌گذاری در دورهٔ بسته است و قفل شده.', '/valuations')
    const raw = String(b.marketValue ?? '').trim()
    const value = Math.round(Number(raw))
    if (raw === '' || !(value >= 0)) return fail('ارزش روز را وارد کنید.')
    const date = b.occurredOn ? parseJalali(String(b.occurredOn)) : v.occurredOn
    if (!date) return fail('تاریخ شمسی معتبر نیست.')
    if (!canEdit(st, date)) return fail(NOT_EDITABLE)
    const row = await Valuation.findOrFail(v.id)
    const before = row.serialize()
    row.merge({ marketValue: value, occurredOn: date, note: String(b.note || '').trim() || null })
    await row.save()
    await audit.change({ auth, request }, { action: 'valuation.update', entity: 'valuation', entityId: row.id, before, after: row.serialize() })
    for (const d of new Set([v.occurredOn, date])) {
      const rep = reportOf(st, d)
      if (rep) await syncLegacy(await Period.findOrFail(rep.period.id))
    }
    session.flash('ok', 'ارزش‌گذاری ویرایش شد.')
    return response.redirect('/valuations')
  }
}
