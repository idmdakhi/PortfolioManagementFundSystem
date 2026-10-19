import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Transaction from '#models/transaction'
import AreaEntry from '#models/area_entry'
import Movement from '#models/movement'
import { findOption, optLabel } from '#services/options'
import { loadState, ledgerOk, areaLedgerOk, type LedgerTx, type AreaMove } from '#services/fund_state'
import { parseJalali, todayIso, todayJalali } from '#services/jalali'
import { canEdit, reportOf, NOT_EDITABLE } from '#services/period_guard'
import { splitAmount, type SplitMode } from '#services/splitter'
import { audit } from '#services/audit'

/** A place money can come from / go to: the fund, an investment area, or outside the system. */
type Place = { kind: 'fund' } | { kind: 'external'; value: string } | { kind: 'area'; id: number }

function parsePlace(v: unknown): Place | null {
  const s = String(v ?? '')
  if (s === 'fund') return { kind: 'fund' }
  if (s === 'external') return { kind: 'external', value: 'external' }
  const e = s.match(/^ext:(.+)$/)
  if (e) return findOption('external_place', e[1])?.active ? { kind: 'external', value: e[1] } : null
  const m = s.match(/^area:(\d+)$/)
  return m ? { kind: 'area', id: Number(m[1]) } : null
}
const refOf = (p: Place) => (p.kind === 'fund' ? 'fund' : p.kind === 'area' ? `area:${p.id}` : `ext:${p.value}`)

const newBatchId = () => 'B' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

export default class MovementsController {
  async index({ view }: HttpContext) {
    const st = await loadState()
    const names = new Map(st.investors.map((i) => [i.id, i.name]))
    const areaNames = new Map(st.areas.map((a) => [a.id, a.name]))
    type Group = { batchId: string; date: string; note: string | null; people: Set<number>; fund: number; area: number; locked: boolean; from: string; to: string; method: string }
    const metas = new Map((await Movement.query()).map((m) => [m.batchId, m]))
    const refLabel = (ref: string) =>
      ref === 'fund' ? 'صندوق' : ref.startsWith('area:') ? (areaNames.get(Number(ref.slice(5))) ?? ref) : ref.startsWith('ext:') ? optLabel('external_place', ref.slice(4)) : ref
    const groups = new Map<string, Group>()
    const get = (id: string, date: string, note: string | null) => {
      if (!groups.has(id)) {
        const m = metas.get(id)
        groups.set(id, {
          batchId: id, date, note, people: new Set(), fund: 0, area: 0, locked: false,
          from: m ? refLabel(m.fromRef) : '—', to: m ? refLabel(m.toRef) : '—', method: m ? optLabel('split_method', m.method) : '—',
        })
      }
      return groups.get(id)!
    }
    for (const t of st.txs) {
      if (!t.batchId) continue
      const g = get(t.batchId, t.occurredOn, t.note)
      g.people.add(t.investorId)
      g.fund += t.type === 'issue' ? t.amount : -t.amount
      if (!canEdit(st, t.occurredOn)) g.locked = true
    }
    for (const e of st.areaEntries) {
      const g = get(e.batchId, e.occurredOn, e.note)
      g.people.add(e.investorId)
      g.area += e.type === 'deposit' ? e.amount : -e.amount
    }
    const list = [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || b.batchId.localeCompare(a.batchId))
    return view.render('pages/movements', { nav: 'mv', st, names, areaNames, list, today: todayJalali() })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const b = request.all()
    const back = (msg: string) => {
      session.flash('error', msg)
      return response.redirect('/movements')
    }
    const st = await loadState()
    const from = parsePlace(b.from)
    const to = parsePlace(b.to)
    if (!from || !to) return back('مبدأ و مقصد را انتخاب کنید.')
    if (from.kind === 'external' && to.kind === 'external') return back('مبدأ و مقصد نمی‌توانند هر دو «خارج از سیستم» باشند.')
    if (from.kind === to.kind && (from.kind !== 'area' || (to.kind === 'area' && from.id === to.id))) {
      if (from.kind !== 'external') return back('مبدأ و مقصد باید متفاوت باشند.')
    }
    for (const p of [from, to]) if (p.kind === 'area' && !st.areas.some((a) => a.id === p.id)) return back('حوزهٔ انتخاب‌شده وجود ندارد.')

    const date = b.occurredOn ? parseJalali(String(b.occurredOn)) : todayIso()
    if (!date) return back('تاریخ شمسی معتبر نیست (مثال: ۱۴۰۵/۰۷/۲۱).')

    const ids = Object.keys(b).filter((k) => k.startsWith('sel_')).map((k) => Number(k.slice(4))).filter((id) => st.investors.some((i) => i.id === id))
    const method = findOption('split_method', String(b.method || b.mode || 'equal'))
    if (!method || !method.active) return back('روش تقسیم معتبر نیست.')
    const engine = String(method.extra.engine || method.value)
    const row = (id: number) => st.current?.rows.find((r) => r.id === id)
    const formVal = (id: number) => Number(b['val_' + id] || 0)
    let mode: SplitMode
    let values: number[]
    if (engine === 'units') {
      mode = 'weight'
      values = ids.map((id) => row(id)?.unitsEnd ?? 0)
    } else if (engine === 'capital') {
      mode = 'weight'
      values = ids.map((id) => Math.max(0, row(id)?.fund.capital ?? 0))
    } else if (engine === 'weight') {
      mode = 'weight'
      values = ids.map((id) => (formVal(id) > 0 ? formVal(id) : (method.extra.weights?.[String(id)] ?? 0)))
    } else {
      mode = engine as SplitMode
      values = ids.map(formVal)
    }
    const split = splitAmount(mode, Number(b.total || 0), values, { roundTo: method.extra.roundTo })
    if ('error' in split) return back(split.error)

    const usesFund = from.kind === 'fund' || to.kind === 'fund'
    const nav = reportOf(st, date)?.summary.nav ?? 0
    if (usesFund) {
      if (!canEdit(st, date)) return back(NOT_EDITABLE)
      if (!(nav > 0)) return back('NAV معتبر نیست.')
    }

    const batchId = newBatchId()
    const note = String(b.note || '').trim() || null
    const txType = from.kind === 'fund' ? 'redeem' : 'issue'
    const txs: LedgerTx[] = usesFund
      ? ids.map((id, i) => ({
          id: 1e9 + i, investorId: id, type: txType, amount: split.amounts[i], nav,
          units: split.amounts[i] / nav, occurredOn: date, note, batchId, kind: 'normal' as const,
        }))
      : []
    const moves: AreaMove[] = []
    ids.forEach((id, i) => {
      if (from.kind === 'area') moves.push({ id: 1e9 + i, areaId: from.id, investorId: id, type: 'withdraw', amount: split.amounts[i], occurredOn: date, note, batchId })
      if (to.kind === 'area') moves.push({ id: 2e9 + i, areaId: to.id, investorId: id, type: 'deposit', amount: split.amounts[i], occurredOn: date, note, batchId })
    })

    if (txs.length && !ledgerOk(st, [...st.txs, ...txs])) return back('واحدهای کافی در صندوق برای این برداشت وجود ندارد.')
    if (moves.length && !areaLedgerOk([...st.areaEntries, ...moves])) return back('موجودی کافی در حوزهٔ مبدأ وجود ندارد.')

    await db.transaction(async (trx) => {
      await Movement.create(
        {
          batchId, fromRef: refOf(from), toRef: refOf(to), method: method.value,
          total: split.amounts.reduce((a, v) => a + v, 0), occurredOn: date, note, createdBy: auth.user!.id,
        },
        { client: trx }
      )
      for (const t of txs) {
        await Transaction.create(
          { investorId: t.investorId, type: t.type, amount: t.amount, nav: t.nav, units: t.units, occurredOn: t.occurredOn, note: t.note, batchId, createdBy: auth.user!.id },
          { client: trx }
        )
      }
      for (const m of moves) {
        await AreaEntry.create(
          { areaId: m.areaId, investorId: m.investorId, type: m.type, amount: m.amount, occurredOn: m.occurredOn, note: m.note, batchId, createdBy: auth.user!.id },
          { client: trx }
        )
      }
    })
    const total = split.amounts.reduce((a, v) => a + v, 0)
    await audit.change(
      { auth, request },
      { action: 'movement.create', entity: 'movement', entityId: batchId, after: { from: refOf(from), to: refOf(to), method: method.value, date, investors: ids, amounts: split.amounts, total } }
    )
    session.flash('ok', `حرکت برای ${ids.length} نفر و جمع ${Math.round(total).toLocaleString('fa-IR')} ریال ثبت شد.`)
    return response.redirect('/movements')
  }

  /** Deletes a whole group (fund transactions and area entries together). */
  async destroy({ params, request, response, session, auth }: HttpContext) {
    const st = await loadState()
    const id = String(params.batch)
    const fail = (msg: string) => {
      session.flash('error', msg)
      return response.redirect('/movements')
    }
    const gTx = st.txs.filter((t) => t.batchId === id)
    const gEn = st.areaEntries.filter((e) => e.batchId === id)
    if (!gTx.length && !gEn.length) return fail('گروه پیدا نشد.')
    if (gTx.some((t) => !canEdit(st, t.occurredOn))) {
      return fail('این گروه در دورهٔ بسته است. برای حذف، «ویرایش دوره‌های بسته» را در تنظیمات روشن کنید.')
    }
    if (!ledgerOk(st, st.txs.filter((t) => t.batchId !== id))) return fail('با حذف این گروه، واحدهای یک سرمایه‌گذار منفی می‌شود.')
    if (!areaLedgerOk(st.areaEntries.filter((e) => e.batchId !== id))) return fail('با حذف این گروه، موجودی یک حوزه منفی می‌شود.')
    const before = { transactions: gTx, areaEntries: gEn, meta: await Movement.findBy('batchId', id).then((m) => m?.serialize() ?? null) }
    await db.transaction(async (trx) => {
      await trx.from('transactions').where('batch_id', id).delete()
      await trx.from('area_entries').where('batch_id', id).delete()
      await trx.from('movements').where('batch_id', id).delete()
    })
    await audit.change({ auth, request }, { action: 'movement.delete', entity: 'movement', entityId: id, before })
    session.flash('ok', 'گروه حذف شد.')
    return response.redirect('/movements')
  }
}
