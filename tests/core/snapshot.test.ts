import { describe, expect, it } from 'vitest'
import { buildAccountSnapshot } from '../../core/snapshot'
import type { CalculationSettings } from '../../core/calculations'

const settings: CalculationSettings = {
  guaranteedReturnRate: 20, fixedFeeRate: 1, performanceFeeRate: 20,
  maxFeeCap: 1_000_000_000, feeRounding: 100_000, periodMonths: 12
}
const period = { startDate: '2026-01-01', endDate: '2026-12-31', months: 12 }

describe('buildAccountSnapshot', () => {
  it('derives everything from ledger rows', () => {
    const s = buildAccountSnapshot([
      { type: 'deposit', amount: 1_000_000_000, unitsMicro: 1_000_000, date: '2025-06-01' }, // before the period
      { type: 'dividend', amount: 10_000_000, unitsMicro: null, date: '2026-05-01' }
    ], period, 1_300_000_000, settings)
    expect(s.costBasis).toBe(1_000_000_000)
    expect(s.averageCapital).toBe(1_000_000_000)
    expect(s.dividends).toBe(10_000_000)
    expect(s.grossProfit).toBe(310_000_000)
    expect(s.unitsMicro).toBe(1_000_000)
    expect(s.marketValueSource).toBe('valuation')
    // fixed 10M + 20% of (310M − 200M) = 22M → 32M
    expect(s.fee).toBe(32_000_000)
  })

  it('weights a mid-year deposit by time and defaults market value to cost basis', () => {
    const s = buildAccountSnapshot([
      { type: 'deposit', amount: 1_000_000_000, unitsMicro: null, date: '2026-07-01' }
    ], period, null, settings)
    expect(s.averageCapital).toBe(Math.round(1_000_000_000 * 184 / 365))
    expect(s.marketValue).toBe(1_000_000_000)
    expect(s.marketValueSource).toBe('cost_basis')
    expect(s.grossProfit).toBe(0)
    expect(s.fee).toBe(Math.floor(Math.round(1_000_000_000 * 184 / 365) * 0.01 / 100_000) * 100_000)
  })

  it('ignores rows after the period end and nets out reversals', () => {
    const s = buildAccountSnapshot([
      { type: 'deposit', amount: 500, unitsMicro: 10, date: '2026-02-01' },
      { type: 'deposit', amount: -500, unitsMicro: -10, date: '2026-02-02' }, // reversal
      { type: 'deposit', amount: 999, unitsMicro: 99, date: '2027-01-01' }   // next period
    ], period, null, settings)
    expect(s.costBasis).toBe(0)
    expect(s.unitsMicro).toBe(0)
  })
})
