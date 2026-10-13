import { test } from '@japa/runner'
import { fundSummary, fundAccount, personalAccount, replayPosition, ledgerIsValid, type PeriodParams } from '#services/fund_calculator'
import { parseJalali, toJalaliStr, yearRange } from '#services/jalali'

// Financial year 1404 from the workbook. Dividends are counted once (workbook: twice),
// so the fee is 201,600,000 instead of the workbook's 201,700,000.
const p: PeriodParams = {
  months: 12, beginMarket: 5330610134, deposits: 28642247575, withdrawals: 11325805905,
  dividends: 1344360, marketValue: 28950492884, fixedRate: 20, mgmtRate: 1, excessRate: 10,
  feeCap: 100, discount: 0, mgmtRate2: 1, excessRate2: 20,
}
const units = 485557 + 343253.27155817015 + 245000 + 215825

test.group('fundSummary', () => {
  test('capital, gross profit (dividends once) and fixed customer profit', ({ assert }) => {
    const s = fundSummary(p, units)
    assert.equal(s.capital, 22647051804)
    assert.equal(s.gross, 6304785440)
    assert.equal(s.fixed, 4529410361)
  })

  test('fee parts, floor to 100,000 and fund profit', ({ assert }) => {
    const s = fundSummary(p, units)
    assert.equal(s.mgmtFee, 24125411)
    assert.equal(s.excessFee, 177537508)
    assert.equal(s.fee, 201600000)
    assert.equal(s.profit, 6304785440 - 201600000)
  })

  test('NAV = (market value - fee) / units', ({ assert }) => {
    assert.approximately(fundSummary(p, units).nav, (28950492884 - 201600000) / units, 1e-9)
    assert.approximately(fundSummary(p, units).nav, 22292.2663, 1e-4)
  })

  test('cap binds, negative excess gives no excess fee, fee never negative', ({ assert }) => {
    assert.equal(fundSummary({ ...p, feeCap: 1 }, units).fee, 10000000)
    const loss = fundSummary({ ...p, marketValue: 20000000000 }, units)
    assert.equal(loss.excessFee, 0)
    assert.equal(fundSummary({ ...p, discount: 1e12 }, units).fee, 0)
  })

  test('a 6-month period prorates the fixed customer profit', ({ assert }) => {
    assert.equal(fundSummary({ ...p, months: 6 }, units).fixed, 2264705180)
  })
})

test.group('fundAccount', () => {
  test('investor nets add up to the fund profit', ({ assert }) => {
    const s = fundSummary(p, units)
    const hs = [300000, 400000, units - 700000]
    const total = hs.reduce(
      (a, u, i) => a + fundAccount({ unitsEnd: u, beginValue: 0, deposits: 1e9 * (i + 1), withdrawals: 0, dividends: (p.dividends * u) / units }, s, units, p).net,
      0
    )
    const capital = 6e9
    assert.approximately(total, s.marketValue - capital + p.dividends - s.fee, 1e-3)
  })

  test('value is already net of fee (not subtracted twice)', ({ assert }) => {
    const s = fundSummary(p, units)
    const a = fundAccount({ unitsEnd: 485557, beginValue: 0, deposits: 8e9, withdrawals: 0, dividends: 0 }, s, units, p)
    assert.approximately(a.net, a.value - 8e9, 1e-3)
  })
})

test.group('personalAccount', () => {
  test('matches the per-investor sheet for "خودم"', ({ assert }) => {
    const a = personalAccount({ beginValue: 2007013240, deposits: 10784013211, withdrawals: 4264247775, marketValue: 10908718992, dividends: 0 }, p)
    assert.approximately(a.gross, 2381940316, 1)
    assert.approximately(a.fixed, 1705355735, 1)
    assert.approximately(a.mgmtFee, 85267787, 1)
    assert.approximately(a.excessFee, 135316916, 1)
  })

  test('personal dividends raise gross profit', ({ assert }) => {
    const base = { beginValue: 1e9, deposits: 0, withdrawals: 0, marketValue: 1.5e9 }
    const d = personalAccount({ ...base, dividends: 5e7 }, p).gross - personalAccount({ ...base, dividends: 0 }, p).gross
    assert.equal(d, 5e7)
  })
})

test.group('ledger', () => {
  test('issue adds cost, redeem removes cost at average', ({ assert }) => {
    const r = replayPosition(100, 1000, [{ type: 'issue', amount: 500, units: 50 }, { type: 'redeem', amount: 600, units: 75 }])
    assert.equal(r.units, 75)
    assert.approximately(r.cost, 750, 1e-9)
  })

  test('detects a redeem that exceeds holdings', ({ assert }) => {
    const open = new Map([[1, 10]])
    assert.isTrue(ledgerIsValid(open, [{ investorId: 1, type: 'redeem', amount: 1, units: 10 }]))
    assert.isFalse(ledgerIsValid(open, [{ investorId: 1, type: 'redeem', amount: 1, units: 11 }]))
  })
})

test.group('jalali', () => {
  test('parses Persian and Latin digits and rejects invalid dates', ({ assert }) => {
    assert.equal(parseJalali('1404/12/29'), '2026-03-20')
    assert.equal(parseJalali('۱۴۰۵/۰۱/۰۱'), '2026-03-21')
    assert.isNull(parseJalali('1404/13/01'))
    assert.isNull(parseJalali('abc'))
  })
  test('round trip and year range', ({ assert }) => {
    assert.equal(toJalaliStr('2026-10-13'), '1405/07/21')
    assert.deepEqual(yearRange(1404), { start: '2025-03-21', end: '2026-03-20' })
  })
})

import { splitAmount } from '#services/splitter'

test.group('splitAmount', () => {
  test('equal split keeps the total (leftover rials to the first people)', ({ assert }) => {
    const r = splitAmount('equal', 100000000, [0, 0, 0]) as { amounts: number[] }
    assert.deepEqual(r.amounts, [33333334, 33333333, 33333333])
    assert.equal(r.amounts.reduce((a, b) => a + b, 0), 100000000)
  })

  test('percent split keeps the total and requires 100%', ({ assert }) => {
    const r = splitAmount('percent', 100000001, [50, 30, 20]) as { amounts: number[] }
    assert.equal(r.amounts.reduce((a, b) => a + b, 0), 100000001)
    assert.deepEqual(r.amounts.slice(1), [30000000, 20000000])
    assert.property(splitAmount('percent', 1000, [50, 30]), 'error')
  })

  test('amount mode uses the given amounts and rejects zeros', ({ assert }) => {
    assert.deepEqual(splitAmount('amount', 0, [10, 20]), { amounts: [10, 20] })
    assert.property(splitAmount('amount', 0, [10, 0]), 'error')
    assert.property(splitAmount('equal', 0, [0, 0]), 'error')
  })
})
