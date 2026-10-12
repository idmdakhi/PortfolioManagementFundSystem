import { describe, expect, it } from 'vitest'
import { calculateAccountPeriod, type CalculationSettings } from '../../core/calculations'

const base: CalculationSettings = {
  guaranteedReturnRate: 20, fixedFeeRate: 1, performanceFeeRate: 20,
  maxFeeCap: 1_000_000_000, feeRounding: 100_000, periodMonths: 12
}

describe('calculateAccountPeriod (no cash flows — previous behaviour)', () => {
  it('computes guaranteed profit, fixed + performance fee', () => {
    const r = calculateAccountPeriod({ beginningCostBasis: 1_000_000_000, marketValue: 1_300_000_000, dividends: 0 }, base)
    expect(r.costBasis).toBe(1_000_000_000)
    expect(r.grossProfit).toBe(300_000_000)
    expect(r.guaranteedProfit).toBe(200_000_000)
    expect(r.fixedFee).toBe(10_000_000)
    expect(r.performanceFee).toBe(20_000_000) // 20% of the 100M excess
    expect(r.finalFee).toBe(30_000_000)
    expect(r.netProfit).toBe(270_000_000)
  })

  it('charges no performance fee below the guaranteed return', () => {
    const r = calculateAccountPeriod({ beginningCostBasis: 1_000_000_000, marketValue: 1_100_000_000, dividends: 0 }, base)
    expect(r.performanceFee).toBe(0)
    expect(r.excessProfit).toBe(0)
    expect(r.finalFee).toBe(10_000_000)
  })

  it('counts deposits, withdrawals and dividends', () => {
    const r = calculateAccountPeriod({
      beginningCostBasis: 1_000_000_000, totalDeposits: 500_000_000, totalWithdrawals: 200_000_000,
      marketValue: 1_400_000_000, dividends: 50_000_000
    }, base)
    expect(r.costBasis).toBe(1_300_000_000)
    expect(r.grossProfit).toBe(150_000_000)
  })
})

describe('fee cap and rounding', () => {
  it('applies the annual cap as-is for a 12 month period', () => {
    const r = calculateAccountPeriod({ beginningCostBasis: 1e10, marketValue: 2e10, dividends: 0 }, base)
    expect(r.feeCap).toBe(1_000_000_000)
    expect(r.finalFee).toBe(1_000_000_000)
  })

  it('prorates the cap for shorter periods', () => {
    const r = calculateAccountPeriod({ beginningCostBasis: 1e10, marketValue: 2e10, dividends: 0 }, { ...base, periodMonths: 6 })
    expect(r.feeCap).toBe(500_000_000)
    expect(r.finalFee).toBe(500_000_000)
  })

  it('supports floor / round / ceil', () => {
    // 1,000,000,000 * 1% = 10,000,000; 10,000,000 / 100,000 is exact, so use an awkward step.
    const data = { beginningCostBasis: 1_000_000_000, marketValue: 1_000_000_000, dividends: 0 }
    const s = { ...base, feeRounding: 3_000_000 } // 10,000,000 / 3,000,000 = 3.33
    expect(calculateAccountPeriod(data, { ...s, feeRoundingMode: 'floor' }).finalFee).toBe(9_000_000)
    expect(calculateAccountPeriod(data, { ...s, feeRoundingMode: 'round' }).finalFee).toBe(9_000_000)
    expect(calculateAccountPeriod(data, { ...s, feeRoundingMode: 'ceil' }).finalFee).toBe(12_000_000)
    expect(calculateAccountPeriod(data, { ...s }).finalFee).toBe(9_000_000) // default = floor
  })

  it('does not round when feeRounding is 0', () => {
    const r = calculateAccountPeriod({ beginningCostBasis: 123_456_789, marketValue: 123_456_789, dividends: 0 }, { ...base, feeRounding: 0 })
    expect(r.finalFee).toBeCloseTo(1_234_567.89, 2)
  })
})

describe('time-weighted capital', () => {
  const period = { periodStart: '2026-01-01', periodEnd: '2026-12-31' }

  it('weights a mid-year deposit by the days it was invested', () => {
    const r = calculateAccountPeriod({
      beginningCostBasis: 0, marketValue: 1_000_000_000, dividends: 0, ...period,
      cashFlows: [{ date: '2026-07-01', amount: 1_000_000_000 }]
    }, base)
    // Jul 1 .. Dec 31 inclusive = 184 days of 365
    expect(r.averageCapital).toBeCloseTo(1_000_000_000 * 184 / 365, 2)
    expect(r.costBasis).toBe(1_000_000_000)
    expect(r.guaranteedProfit).toBeCloseTo(r.averageCapital * 0.2, 2)
    expect(r.fixedFee).toBeCloseTo(r.averageCapital * 0.01, 2)
  })

  it('a deposit on day one counts for the whole period', () => {
    const r = calculateAccountPeriod({
      beginningCostBasis: 0, marketValue: 1e9, dividends: 0, ...period,
      cashFlows: [{ date: '2026-01-01', amount: 1e9 }]
    }, base)
    expect(r.averageCapital).toBe(1e9)
  })

  it('handles withdrawals', () => {
    const r = calculateAccountPeriod({
      beginningCostBasis: 1e9, marketValue: 5e8, dividends: 0, ...period,
      cashFlows: [{ date: '2026-07-01', amount: -5e8 }]
    }, base)
    expect(r.costBasis).toBe(5e8)
    expect(r.averageCapital).toBeCloseTo(1e9 - 5e8 * 184 / 365, 2)
  })

  it('rejects cash flows outside the period or without period dates', () => {
    expect(() => calculateAccountPeriod({
      beginningCostBasis: 0, marketValue: 0, dividends: 0, ...period, cashFlows: [{ date: '2027-01-01', amount: 1 }]
    }, base)).toThrow(RangeError)
    expect(() => calculateAccountPeriod({
      beginningCostBasis: 0, marketValue: 0, dividends: 0, cashFlows: [{ date: '2026-01-01', amount: 1 }]
    }, base)).toThrow(RangeError)
  })
})
