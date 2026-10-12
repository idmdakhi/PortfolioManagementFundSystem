import { calculateAccountPeriod, calculateReturnPercent, type CalculationSettings, type CashFlow } from './calculations'
import { capitalDelta, unitsDeltaMicro } from './ledger'

export interface LedgerRow { type: string; amount: number; unitsMicro: number | null; date: string }
export interface PeriodRange { startDate: string; endDate: string; months: number }

export interface AccountSnapshot {
  costBasis: number
  averageCapital: number
  marketValue: number
  marketValueSource: 'valuation' | 'cost_basis'
  dividends: number
  grossProfit: number
  guaranteedProfit: number
  fee: number
  returnPercent: number
  unitsMicro: number
}

/**
 * Builds one account's period snapshot purely from its ledger rows (all rows up to period end)
 * and the latest valuation at/before period end. Nothing here is entered by hand.
 * If there is no valuation, market value defaults to cost basis (flat) and the source says so.
 */
export function buildAccountSnapshot(
  rows: LedgerRow[], period: PeriodRange, marketValue: number | null, settings: CalculationSettings
): AccountSnapshot {
  let beginning = 0
  let units = 0
  let dividends = 0
  const cashFlows: CashFlow[] = []
  for (const r of rows) {
    if (r.date > period.endDate) continue
    units += unitsDeltaMicro(r.type, r.unitsMicro)
    if (r.date < period.startDate) {
      beginning += capitalDelta(r.type, r.amount)
      continue
    }
    const flow = capitalDelta(r.type, r.amount)
    if (flow !== 0) cashFlows.push({ date: r.date, amount: flow })
    if (r.type === 'dividend') dividends += r.amount
  }

  const costBasis = beginning + cashFlows.reduce((s, f) => s + f.amount, 0)
  const mv = marketValue ?? costBasis
  const calc = calculateAccountPeriod({
    beginningCostBasis: beginning, marketValue: mv, dividends,
    cashFlows, periodStart: period.startDate, periodEnd: period.endDate
  }, { ...settings, periodMonths: period.months })

  return {
    costBasis,
    averageCapital: Math.round(calc.averageCapital),
    marketValue: mv,
    marketValueSource: marketValue === null ? 'cost_basis' : 'valuation',
    dividends,
    grossProfit: Math.round(calc.grossProfit),
    guaranteedProfit: Math.round(calc.guaranteedProfit),
    fee: Math.round(calc.finalFee),
    returnPercent: calculateReturnPercent(costBasis, mv + dividends),
    unitsMicro: units
  }
}
