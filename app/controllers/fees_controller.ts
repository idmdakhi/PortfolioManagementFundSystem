import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Transaction from '#models/transaction'
import FeeReceipt from '#models/fee_receipt'
import Option from '#models/option'
import { loadState, ledgerOk, type State } from '#services/fund_state'
import { parseJalali, todayIso, todayJalali } from '#services/jalali'
import { invalidateOptions, managerInvestorId } from '#services/options'
import { canEdit } from '#services/period_guard'
import { audit } from '#services/audit'

const num = (v: unknown) => Number(v)
/** The manager investor: the saved setting, else the investor named «خودم». */
const managerOf = (st: State) => managerInvestorId() ?? st.investors.find((i) => i.name === 'خودم')?.id ?? null

export default class FeesController {
  async index({ view, request }: HttpContext) {
    const st = await loadState()
    const pid = Number(request.input('p'))
    const rep = st.reports.find((r) => r.period.id === pid) ?? st.current
    const names = new Map(st.investors.map((i) => [i.id, i.name]))
    const mid = managerOf(st)
    const label = (iso: string) => st.reports.find((r) => iso >= r.period.startOn && iso <= r.period.endOn)?.period.label ?? '—'
    const list = [...st.fees].reverse().map((f) => ({ ...f, periodLabel: label(f.occurredOn) }))
    return view.render('pages/fees', {
      nav: 'fee', st, rep, names, list, today: todayJalali(),
      managerId: mid, managerName: mid ? (names.get(mid) ?? '—') : '—',
    })
  }

  /** Records a received fee (fund or personal); a fund fee can also be paid out in cash from the fund. */
  async store({ request, response, session, auth }: HttpContext) {
    const b = request.all()
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/fees')
    }
    const st = await loadState()
    const scope = b.scope === 'personal' ? 'personal' : 'fund'
    const amount = Math.round(num(b.amount))
    if (!(amount > 0)) return fail('مبلغ را وارد کنید.')
    const date = b.occurredOn ? parseJalali(String(b.occurredOn)) : todayIso()
    if (!date) return fail('تاریخ شمسی معتبر نیست (مثال: ۱۴۰۵/۰۷/۲۱).')
    const rep = st.reports.find((r) => date >= r.period.startOn && date <= r.period.endOn)
    if (!rep) return fail('تاریخ باید داخل یکی از دوره‌های مالی باشد.')
    let investorId: number | null = null
    let method = 'record'
    if (scope === 'personal') {
      investorId = num(b.investorId)
      if (!st.investors.some((i) => i.id === investorId)) return fail('برای کارمزد شخصی، سرمایه‌گذار را انتخاب کنید.')
    } else if (b.method === 'cash') {
      method = 'cash'
      if (!canEdit(st, date)) return fail('پرداخت نقدی فقط در دورهٔ قابل ویرایش ممکن است. برای دورهٔ بسته از «ثبت سابقه» استفاده کنید.')
      if (amount > Math.round(rep.summary.feeRemaining)) return fail(`مبلغ بیشتر از کارمزد باقی‌مانده است (${Math.round(rep.summary.feeRemaining).toLocaleString('fa-IR')} ریال).`)
    }
    const created = await FeeReceipt.create({
      scope, investorId, amount, occurredOn: date, method, note: String(b.note || '').trim() || null, createdBy: auth.user!.id,
    })
    await audit.change({ auth, request }, { action: 'fee.create', entity: 'fee_receipt', entityId: created.id, after: created.serialize() })
    session.flash('ok', 'کارمزد دریافتی ثبت شد.')
    return response.redirect('/fees')
  }

  /** Moves (part of) the owed fund fee to the manager by issuing fund units at the current NAV. */
  async transfer({ request, response, session, auth }: HttpContext) {
    const b = request.all()
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/fees')
    }
    const st = await loadState()
    const rep = st.current
    const mid = managerOf(st)
    if (!mid || !st.investors.some((i) => i.id === mid)) return fail('ابتدا سرمایه‌گذار سبدگردان را انتخاب کنید.')
    if (!rep || rep.period.status !== 'open') return fail('دورهٔ مالی بازی وجود ندارد.')
    const date = b.occurredOn ? parseJalali(String(b.occurredOn)) : todayIso()
    if (!date) return fail('تاریخ شمسی معتبر نیست.')
    if (date < rep.period.startOn || date > rep.period.endOn) return fail('تاریخ باید داخل دورهٔ مالی باز باشد.')
    const amount = Math.round(num(b.amount))
    const remaining = Math.round(rep.summary.feeRemaining)
    if (!(amount > 0)) return fail('مبلغ را وارد کنید.')
    if (amount > remaining) return fail(`مبلغ بیشتر از کارمزد باقی‌مانده است (${remaining.toLocaleString('fa-IR')} ریال).`)
    const nav = num(b.nav) > 0 ? num(b.nav) : rep.summary.nav
    if (!(nav > 0)) return fail('NAV معتبر نیست.')
    const units = amount / nav
    const note = String(b.note || '').trim() || 'انتقال کارمزد با صدور واحد'
    const made = await db.transaction(async (trx) => {
      const tx = await Transaction.create(
        { investorId: mid, type: 'issue', kind: 'fee', amount, nav, units, occurredOn: date, note, createdBy: auth.user!.id },
        { client: trx }
      )
      const receipt = await FeeReceipt.create(
        { scope: 'fund', investorId: null, amount, occurredOn: date, method: 'units', note, txId: tx.id, createdBy: auth.user!.id },
        { client: trx }
      )
      return { tx: tx.serialize(), receipt: receipt.serialize() }
    })
    await audit.change({ auth, request }, { action: 'fee.transfer', entity: 'fee_receipt', entityId: made.receipt.id, after: made })
    session.flash('ok', `${amount.toLocaleString('fa-IR')} ریال کارمزد به‌صورت ${units.toLocaleString('fa-IR', { maximumFractionDigits: 4 })} واحد صادر شد.`)
    return response.redirect('/fees')
  }

  async manager({ request, response, session }: HttpContext) {
    const id = num(request.input('investorId'))
    const st = await loadState()
    if (!st.investors.some((i) => i.id === id)) {
      session.flash('error', 'سرمایه‌گذار معتبر نیست.')
    } else {
      const opt =
        (await Option.query().where('list', 'setting').where('value', 'manager_investor').first()) ??
        new Option().merge({ list: 'setting', value: 'manager_investor', label: 'سرمایه‌گذار سبدگردان (دریافت‌کنندهٔ واحد کارمزد)', active: true, builtin: true, sort: 99 })
      opt.extra = JSON.stringify({ investorId: id })
      await opt.save()
      invalidateOptions()
      session.flash('ok', 'سبدگردان تعیین شد.')
    }
    return response.redirect('/fees')
  }

  async destroy({ params, request, response, session, auth }: HttpContext) {
    const st = await loadState()
    const f = st.fees.find((x) => x.id === Number(params.id))
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/fees')
    }
    if (!f) return fail('مورد پیدا نشد.')
    const affectsMath = f.method === 'cash' || f.method === 'units'
    if (affectsMath && !canEdit(st, f.occurredOn)) {
      return fail('این مورد در دورهٔ بسته است و قابل حذف نیست.')
    }
    if (f.method === 'units' && f.txId) {
      if (!ledgerOk(st as State, st.txs.filter((t) => t.id !== f.txId))) return fail('با حذف این مورد، واحدهای سبدگردان منفی می‌شود.')
    }
    await db.transaction(async (trx) => {
      if (f.method === 'units' && f.txId) await trx.from('transactions').where('id', f.txId).delete()
      await trx.from('fee_receipts').where('id', f.id).delete()
    })
    await audit.change({ auth, request }, { action: 'fee.delete', entity: 'fee_receipt', entityId: f.id, before: { receipt: f, tx: f.txId ? st.txs.find((t) => t.id === f.txId) : null } })
    session.flash('ok', 'حذف شد.')
    return response.redirect('/fees')
  }

  async edit({ view, params, response, session }: HttpContext) {
    const st = await loadState()
    const f = st.fees.find((x) => x.id === Number(params.id))
    if (!f || (f.method !== 'record' && f.method !== 'settle')) {
      session.flash('error', 'فقط «ثبت سابقه» و «تسویهٔ پایان دوره» قابل ویرایش‌اند. پرداخت نقدی و صدور واحد را حذف و دوباره ثبت کنید.')
      return response.redirect('/fees')
    }
    return view.render('pages/fee_edit', { nav: 'fee', st, f })
  }

  async update({ request, params, response, session, auth }: HttpContext) {
    const b = request.all()
    const st = await loadState()
    const f = st.fees.find((x) => x.id === Number(params.id))
    const back = `/fees/${params.id}/edit`
    const fail = (m: string, to = back) => {
      session.flash('error', m)
      return response.redirect(to)
    }
    if (!f || (f.method !== 'record' && f.method !== 'settle')) return fail('مورد پیدا نشد.', '/fees')
    const amount = Math.round(num(b.amount))
    if (!(amount > 0)) return fail('مبلغ را وارد کنید.')
    const date = b.occurredOn ? parseJalali(String(b.occurredOn)) : f.occurredOn
    if (!date) return fail('تاریخ شمسی معتبر نیست.')
    if (!st.reports.some((r) => date >= r.period.startOn && date <= r.period.endOn)) return fail('تاریخ باید داخل یکی از دوره‌های مالی باشد.')
    const scope = b.scope === 'personal' ? 'personal' : 'fund'
    let investorId: number | null = null
    if (scope === 'personal') {
      investorId = num(b.investorId)
      if (!st.investors.some((i) => i.id === investorId)) return fail('برای کارمزد شخصی، سرمایه‌گذار را انتخاب کنید.')
    }
    const row = await FeeReceipt.findOrFail(f.id)
    const before = row.serialize()
    row.merge({ scope, investorId, amount, occurredOn: date, note: String(b.note || '').trim() || null })
    await row.save()
    await audit.change({ auth, request }, { action: 'fee.update', entity: 'fee_receipt', entityId: row.id, before, after: row.serialize() })
    session.flash('ok', 'ویرایش شد.')
    return response.redirect('/fees')
  }
}
