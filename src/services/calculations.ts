import Decimal from 'decimal.js'
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export type FeeRoundingMode = 'floor' | 'round' | 'ceil'

export interface CalculationSettings {
  guaranteedReturnRate: number; fixedFeeRate: number; performanceFeeRate: number
  /** Annual cap; prorated by periodMonths / 12. */
  maxFeeCap: number
  feeRounding: number
  /** Defaults to 'floor' (the previous behaviour). */
  feeRoundingMode?: FeeRoundingMode
  periodMonths: number
}

/** Positive = deposit, negative = withdrawal. `date` is YYYY-MM-DD, inside the period. */
export interface CashFlow { date: string; amount: number }

export interface AccountPeriodData {
  beginningCostBasis: number
  /** Ignored when `cashFlows` is provided. */
  totalDeposits?: number
  /** Ignored when `cashFlows` is provided. */
  totalWithdrawals?: number
  marketValue: number
  dividends: number
  /**
   * Dated deposits/withdrawals (needs periodStart + periodEnd). When present, the guaranteed
   * profit and the fixed fee are charged on the TIME-WEIGHTED average capital, so money that
   * sat in the account for 10 days is not treated like money held all year.
   * Without it, the ending cost basis is used (previous behaviour).
   */
  cashFlows?: CashFlow[]
  periodStart?: string
  periodEnd?: string
}

export interface CalculationResult {
  costBasis: number; averageCapital: number; marketValue: number; grossProfit: number
  guaranteedProfit: number; netProfit: number; fixedFee: number; performanceFee: number
  totalFeeBeforeCap: number; feeCap: number; finalFee: number; excessProfit: number
}

const MS_PER_DAY = 86_400_000

function dayNumber(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) throw new RangeError(`Invalid date: ${iso}`)
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (new Date(t).toISOString().slice(0, 10) !== iso) throw new RangeError(`Invalid date: ${iso}`)
  return t / MS_PER_DAY
}

export function roundToMultiple(value: Decimal, step: number, mode: FeeRoundingMode = 'floor'): Decimal {
  if (step <= 0) return value
  const q = value.div(step)
  const r = mode === 'ceil' ? q.ceil() : mode === 'round' ? q.toDecimalPlaces(0, Decimal.ROUND_HALF_UP) : q.floor()
  return r.times(step)
}

export function calculateAccountPeriod(data: AccountPeriodData, settings: CalculationSettings): CalculationResult {
  const beginning = new Decimal(data.beginningCostBasis)
  let deposits = new Decimal(data.totalDeposits ?? 0)
  let withdrawals = new Decimal(data.totalWithdrawals ?? 0)
  let averageCapital: Decimal

  if (data.cashFlows && data.cashFlows.length > 0) {
    if (!data.periodStart || !data.periodEnd) throw new RangeError('periodStart and periodEnd are required with cashFlows')
    const start = dayNumber(data.periodStart)
    const end = dayNumber(data.periodEnd)
    if (end < start) throw new RangeError('periodEnd is before periodStart')
    const totalDays = end - start + 1
    deposits = new Decimal(0)
    withdrawals = new Decimal(0)
    averageCapital = beginning
    for (const f of data.cashFlows) {
      const d = dayNumber(f.date)
      if (d < start || d > end) throw new RangeError(`Cash flow ${f.date} is outside the period`)
      // Capital is "in place" from the flow date through the last day of the period (inclusive).
      const weight = new Decimal(end - d + 1).div(totalDays)
      averageCapital = averageCapital.plus(new Decimal(f.amount).times(weight))
      if (f.amount >= 0) deposits = deposits.plus(f.amount)
      else withdrawals = withdrawals.minus(f.amount)
    }
    averageCapital = Decimal.max(averageCapital, 0)
  } else {
    averageCapital = beginning.plus(deposits).minus(withdrawals)
  }

  const costBasis = beginning.plus(deposits).minus(withdrawals)
  const marketValue = new Decimal(data.marketValue)
  const grossProfit = marketValue.minus(costBasis).plus(data.dividends)
  const periodFraction = new Decimal(settings.periodMonths).div(12)

  const guaranteedProfit = averageCapital.times(settings.guaranteedReturnRate).div(100).times(periodFraction)
  const fixedFee = averageCapital.times(settings.fixedFeeRate).div(100).times(periodFraction)
  const excess = grossProfit.minus(guaranteedProfit)
  const performanceFee = excess.gt(0) ? excess.times(settings.performanceFeeRate).div(100) : new Decimal(0)
  const totalFeeBeforeCap = fixedFee.plus(performanceFee)

  const feeCap = new Decimal(settings.maxFeeCap).times(periodFraction)
  const capped = Decimal.min(totalFeeBeforeCap, feeCap)
  const finalFee = Decimal.max(roundToMultiple(capped, settings.feeRounding, settings.feeRoundingMode ?? 'floor'), 0)

  return {
    costBasis: costBasis.toNumber(), averageCapital: averageCapital.toNumber(), marketValue: marketValue.toNumber(),
    grossProfit: grossProfit.toNumber(), guaranteedProfit: guaranteedProfit.toNumber(),
    netProfit: grossProfit.minus(finalFee).toNumber(),
    fixedFee: fixedFee.toNumber(), performanceFee: performanceFee.toNumber(),
    totalFeeBeforeCap: totalFeeBeforeCap.toNumber(), feeCap: feeCap.toNumber(), finalFee: finalFee.toNumber(),
    excessProfit: Decimal.max(excess, 0).toNumber()
  }
}

export function calculateNAV(totalMarketValue: number, outstandingFees: number, totalUnits: number): number {
  if (totalUnits <= 0) return 0
  return new Decimal(totalMarketValue).minus(outstandingFees).div(totalUnits).toNumber()
}
export function calculateUnitsOnDeposit(depositAmount: number, currentNAV: number): number {
  if (currentNAV <= 0) return 0
  return new Decimal(depositAmount).div(currentNAV).toNumber()
}
export function calculateReturnPercent(costBasis: number, marketValue: number): number {
  if (costBasis <= 0) return 0
  return new Decimal(marketValue).minus(costBasis).div(costBasis).times(100).toNumber()
}
