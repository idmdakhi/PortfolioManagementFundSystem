import { test } from '@japa/runner'
import { fundSummary, personalAccount, replayPosition, type PeriodParams } from '#services/fund_calculator'

// Numbers taken from the workbook (financial year ending 1404/12/29).
const p: PeriodParams = {
  months: 12, beginCost: 5330610134, deposits: 28642247575, withdrawals: 11325805905,
  dividends: 1344360, marketValue: 28950492884, fixedRate: 20, mgmtRate: 1, excessRate: 10,
  feeCap: 100, discount: 0, mgmtRate2: 1, excessRate2: 20,
}
const units = 485557 + 343253.27155817015 + 245000 + 215825

test.group('fundSummary (workbook parity)', () => {
  test('end cost, gross profit and fixed customer profit', ({ assert }) => {
    const s = fundSummary(p, units)
    assert.equal(s.endCost, 22647051804)
    assert.equal(s.gross, 6306129800)
    assert.approximately(s.fixed, 4529410360.8, 0.01)
  })

  test('fee is capped, floored to 100,000 and equals the workbook value', ({ assert }) => {
    const s = fundSummary(p, units)
    assert.approximately(s.mgmtFee, 24125410.74, 0.01)
    assert.approximately(s.excessFee, 177671943.92, 0.01)
    assert.equal(s.fee, 201700000)
    assert.equal(s.fundProfit, 6104429800)
  })

  test('NAV matches the workbook', ({ assert }) => {
    assert.approximately(fundSummary(p, units).nav, 22292.188743616618, 1e-9)
  })

  test('fee cap binds when the raw fee is larger', ({ assert }) => {
    assert.equal(fundSummary({ ...p, feeCap: 1 }, units).fee, 10000000)
  })
})

test.group('personalAccount (per-investor sheet)', () => {
  test('matches the sheet for "خودم"', ({ assert }) => {
    const a = personalAccount({ endCost: 8526778675.5775185, marketValue: 10908718991.848377 }, p)
    assert.approximately(a.gross, 2381940316.27, 0.01)
    assert.approximately(a.fixed, 1705355735.12, 0.01)
    assert.approximately(a.mgmtFee, 85267786.76, 0.01)
    assert.approximately(a.excessFee, 135316916.23, 0.01)
  })
})

test.group('replayPosition', () => {
  test('issue adds cost, redeem removes cost at average', ({ assert }) => {
    const r = replayPosition(100, 1000, [
      { type: 'issue', amount: 500, units: 50 },
      { type: 'redeem', amount: 600, units: 75 },
    ])
    assert.equal(r.units, 75)
    assert.approximately(r.cost, 750, 1e-9)
  })
})
