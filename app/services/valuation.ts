import { addDays } from '#services/jalali'

export interface Val {
  id: number
  occurredOn: string
  marketValue: number
  kind: 'open' | 'value' | 'close'
}

export interface PeriodRange {
  startOn: string
  endOn: string
  marketValueBase: number
  valuationOn: string
}

/**
 * The valuation a period's market value is built on: the latest ledger entry inside the period.
 * An opening entry counts as of the day BEFORE the period starts, so flows on the first day are included.
 * Without any entry the stored legacy value is used (older data and older backups).
 */
export function baseline(p: PeriodRange, vals: Val[]) {
  const inRange = vals.filter((v) => v.occurredOn >= p.startOn && v.occurredOn <= p.endOn)
  if (!inRange.length) {
    return { value: p.marketValueBase, effDate: p.valuationOn, source: 'legacy' as const, kind: null }
  }
  const eff = (v: Val) => (v.kind === 'open' ? addDays(v.occurredOn, -1) : v.occurredOn)
  const last = [...inRange].sort((a, b) => eff(a).localeCompare(eff(b)) || a.id - b.id)[inRange.length - 1]
  return { value: last.marketValue, effDate: eff(last), source: 'ledger' as const, kind: last.kind }
}
