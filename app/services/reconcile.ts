import type { State, Report } from '#services/fund_state'
import { addDays } from '#services/jalali'

/**
 * Financial reconciliation (docs/Ledger.md). Read-only: it reports differences and never "fixes" them.
 * `error` blocks closing a period; `warning` is worth a look but may be legitimate (manual edits, rounding).
 */
export type Level = 'ok' | 'warning' | 'error'
export interface Check {
  id: string
  title: string
  level: Level
  detail: string
  items: string[]
}
export interface Reconciliation {
  checks: Check[]
  errors: number
  warnings: number
  ok: boolean
}

const MAX_ITEMS = 10
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

function make(id: string, title: string, level: Exclude<Level, 'ok'>, problems: string[], okText: string): Check {
  if (!problems.length) return { id, title, level: 'ok', detail: okText, items: [] }
  const extra = problems.length > MAX_ITEMS ? [`… و ${problems.length - MAX_ITEMS} مورد دیگر`] : []
  return { id, title, level, detail: `${problems.length} مورد`, items: [...problems.slice(0, MAX_ITEMS), ...extra] }
}

export function reconcile(st: State, today: string, staleDays = 45): Reconciliation {
  const names = new Map(st.investors.map((i) => [i.id, i.name]))
  const nm = (id: number) => names.get(id) ?? `#${id}`
  const periodOf = (d: string) => st.reports.find((r) => d >= r.period.startOn && d <= r.period.endOn)
  const checks: Check[] = []

  // 1. units never negative, on any date
  {
    const bad: string[] = []
    for (const inv of st.investors) {
      let units = inv.openingUnits
      for (const t of st.txs.filter((x) => x.investorId === inv.id)) {
        units += t.type === 'issue' ? t.units : -t.units
        if (units < -1e-6) {
          bad.push(`${nm(inv.id)}: واحد منفی در تاریخ ${t.occurredOn} (تراکنش ${t.id})`)
          break
        }
      }
    }
    checks.push(make('units-non-negative', 'واحد هیچ سرمایه‌گذاری در هیچ تاریخی منفی نیست', 'error', bad, 'همه مانده‌ها صفر یا مثبت‌اند.'))
  }

  // 2. every transaction: units == amount / nav
  {
    const bad = st.txs
      .filter((t) => !(t.nav > 0) || Math.abs(t.units - t.amount / t.nav) > 1e-6 + 1e-9 * Math.abs(t.units))
      .map((t) => `تراکنش ${t.id} (${nm(t.investorId)}): واحد ${t.units} با مبلغ ÷ NAV نمی‌خواند`)
    checks.push(make('tx-units-consistent', 'واحد هر تراکنش = مبلغ ÷ NAV', 'error', bad, 'همه تراکنش‌ها سازگارند.'))
  }

  // 3. dates inside a period (everything that carries a date)
  {
    const bad: string[] = []
    const chk = (what: string, id: number, d: string) => {
      if (!periodOf(d)) bad.push(`${what} ${id}: تاریخ ${d} داخل هیچ دوره‌ای نیست`)
    }
    st.txs.forEach((t) => chk('تراکنش', t.id, t.occurredOn))
    st.divs.forEach((d) => chk('سود تقسیمی', d.id, d.occurredOn))
    st.fees.forEach((f) => chk('کارمزد', f.id, f.occurredOn))
    st.areaEntries.forEach((e) => chk('ثبت حوزه', e.id, e.occurredOn))
    st.valuations.forEach((v) => chk('ارزش‌گذاری', v.id, v.occurredOn))
    checks.push(make('dates-in-period', 'همهٔ تاریخ‌ها داخل یک دورهٔ مالی‌اند', 'error', bad, 'هیچ رکوردی بیرون از دوره‌ها نیست.'))
  }

  // 4. periods do not overlap
  {
    const bad: string[] = []
    const ps = st.reports.map((r) => r.period)
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++)
        if (ps[i].startOn <= ps[j].endOn && ps[j].startOn <= ps[i].endOn) bad.push(`دوره‌های «${ps[i].label}» و «${ps[j].label}» هم‌پوشانی دارند`)
    checks.push(make('periods-no-overlap', 'دوره‌ها هم‌پوشانی ندارند', 'error', bad, 'بازه‌ها جدا از هم‌اند.'))
  }

  // 4b. at most one open period
  {
    const open = st.reports.filter((r) => r.period.status === 'open')
    const bad = open.length > 1 ? [`${open.length} دورهٔ باز وجود دارد (${open.map((r) => r.period.label).join('، ')})`] : []
    checks.push(make('single-open-period', 'حداکثر یک دورهٔ باز', 'error', bad, 'تعداد دورهٔ باز درست است.'))
  }

  // 5. NAV positive when units exist; investor values add up to the fund value
  {
    const badNav: string[] = []
    const badSum: string[] = []
    for (const r of st.reports) {
      if (r.totalUnits > 0 && !(r.summary.nav > 0)) badNav.push(`دورهٔ ${r.period.label}: NAV = ${r.summary.nav}`)
      if (r.totalUnits > 0) {
        const sum = r.rows.reduce((a, x) => a + x.fund.value, 0)
        const expect = r.summary.marketValue - r.summary.feeRemaining
        if (Math.abs(sum - expect) > 1) badSum.push(`دورهٔ ${r.period.label}: جمع ارزش افراد ${fmt(sum)} با ارزش صندوق پس از کارمزد ${fmt(expect)} فرق دارد`)
      }
    }
    checks.push(make('nav-positive', 'NAV برای دوره‌های دارای واحد مثبت است', 'error', badNav, 'NAV همه دوره‌ها مثبت است.'))
    checks.push(make('investor-values-sum', 'جمع ارزش سرمایه‌گذاران = ارزش صندوق پس از کارمزد', 'error', badSum, 'جمع‌ها برابرند.'))
  }

  // 6. fee-unit transactions and fee receipts point at each other
  {
    const bad: string[] = []
    for (const t of st.txs.filter((x) => x.kind === 'fee')) {
      const rec = st.fees.find((f) => f.method === 'units' && f.txId === t.id)
      if (!rec) bad.push(`تراکنش کارمزد ${t.id} رسید کارمزد ندارد`)
      else if (rec.amount !== t.amount) bad.push(`تراکنش کارمزد ${t.id}: مبلغ ${fmt(t.amount)} با رسید ${fmt(rec.amount)} فرق دارد`)
    }
    for (const f of st.fees.filter((x) => x.method === 'units')) {
      if (!f.txId || !st.txs.some((t) => t.id === f.txId && t.kind === 'fee')) bad.push(`رسید کارمزد ${f.id} به تراکنش کارمزد معتبر وصل نیست`)
    }
    checks.push(make('fee-units-linked', 'تراکنش‌های صدور واحد کارمزد و رسیدهایشان یکدیگر را تأیید می‌کنند', 'error', bad, 'همه جفت‌ها کامل‌اند.'))
  }

  // 7. area balances never negative
  {
    const bad: string[] = []
    const flagged = new Set<string>()
    const bal = new Map<string, number>()
    const areaName = new Map(st.areas.map((a) => [a.id, a.name]))
    const sorted = [...st.areaEntries].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id - b.id)
    for (const e of sorted) {
      const k = `${e.areaId}:${e.investorId}`
      const v = (bal.get(k) ?? 0) + (e.type === 'deposit' ? e.amount : -e.amount)
      if (v < -0.5 && !flagged.has(k)) {
        flagged.add(k)
        bad.push(`${nm(e.investorId)}: مانده «${areaName.get(e.areaId) ?? e.areaId}» در ${e.occurredOn} منفی می‌شود`)
      }
      bal.set(k, v)
    }
    checks.push(make('area-balances', 'مانده هیچ‌کس در هیچ حوزه‌ای منفی نیست', 'error', bad, 'همه مانده‌ها صفر یا مثبت‌اند.'))
  }

  // 8. fee settled never exceeds fee accrued
  {
    const bad = st.reports
      .filter((r) => r.summary.feeRemaining < -1)
      .map((r) => `دورهٔ ${r.period.label}: دریافتی ${fmt(r.summary.feeSettled)} از کارمزد محاسبه‌شده ${fmt(r.summary.fee)} بیشتر است`)
    checks.push(make('fee-not-overpaid', 'کارمزد تسویه‌شده از کارمزد محاسبه‌شده بیشتر نیست', 'warning', bad, 'هیچ دوره‌ای بیش‌تسویه نیست.'))
  }

  // 9. opening value of a period follows the previous period's closing value (after fee)
  {
    const bad: string[] = []
    for (let i = 1; i < st.reports.length; i++) {
      const prev: Report = st.reports[i - 1]
      const cur: Report = st.reports[i]
      const expect = Math.round(prev.params.marketValue) - Math.max(0, Math.round(prev.summary.feeRemaining))
      const have = Number(cur.period.beginMarket)
      if (addDays(prev.period.endOn, 1) === cur.period.startOn && Math.abs(have - expect) > 1)
        bad.push(`دورهٔ ${cur.period.label}: ارزش ابتدا ${fmt(have)} ولی پایان دورهٔ ${prev.period.label} پس از کارمزد ${fmt(expect)} است`)
    }
    checks.push(make('period-continuity', 'ارزش ابتدای هر دوره = پایان دورهٔ قبل پس از کارمزد', 'warning', bad, 'پیوستگی دوره‌ها برقرار است.'))
  }

  // 10. stale valuation in the open period
  {
    const open = st.reports.find((r) => r.period.status === 'open')
    const bad: string[] = []
    if (open && open.totalUnits > 0) {
      const limit = addDays(today, -staleDays)
      const effective = open.valuation.latestOn
      if (effective < limit && today >= open.period.startOn && today <= open.period.endOn)
        bad.push(`آخرین ارزش‌گذاری دورهٔ ${open.period.label} مربوط به ${effective} است (بیش از ${staleDays} روز پیش)`)
    }
    checks.push(make('valuation-fresh', 'ارزش‌گذاری دورهٔ باز تازه است', 'warning', bad, 'ارزش‌گذاری به‌روز است.'))
  }

  const errors = checks.filter((c) => c.level === 'error').length
  const warnings = checks.filter((c) => c.level === 'warning').length
  return { checks, errors, warnings, ok: errors === 0 }
}
