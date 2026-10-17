export interface Opt {
  id: number
  list: string
  value: string
  label: string
  extra: { engine?: string; roundTo?: number; weights?: Record<string, number>; investorId?: number | null; rate?: number; on?: boolean }
  active: boolean
  builtin: boolean
  sort: number
}

export const LISTS = ['area_kind', 'external_place', 'split_method', 'label'] as const
export const ENGINES: Record<string, string> = {
  equal: 'مساوی', percent: 'درصدی', amount: 'مبلغ جداگانه', weight: 'وزنی (عدد دلخواه)',
  units: 'به نسبت واحد صندوق', capital: 'به نسبت سرمایهٔ صندوقی',
}

let cache: Opt[] | null = null

/** The model is imported lazily so that console commands (e.g. migrations) boot before the table exists. */
export async function loadOptions() {
  const { default: Option } = await import('#models/option')
  const rows = await Option.query().orderBy('sort').orderBy('id')
  cache = rows.map((r) => {
    let extra = {}
    try {
      extra = r.extra ? JSON.parse(r.extra) : {}
    } catch {
      extra = {}
    }
    return { id: r.id, list: r.list, value: r.value, label: r.label, extra, active: !!r.active, builtin: !!r.builtin, sort: r.sort }
  })
}
export const ensureOptions = async () => {
  if (!cache) await loadOptions()
}
export const invalidateOptions = () => {
  cache = null
}

/** All options of a list (active only by default), in display order. */
export const optionsOf = (list: string, activeOnly = true): Opt[] =>
  (cache ?? []).filter((o) => o.list === list && (!activeOnly || o.active))
export const findOption = (list: string, value: string) => (cache ?? []).find((o) => o.list === list && o.value === value)
export const optLabel = (list: string, value: string) => findOption(list, value)?.label ?? value

/** The investor who receives fee units (the manager), from the 'setting' list. */
export const managerInvestorId = (): number | null => findOption('setting', 'manager_investor')?.extra.investorId ?? null

/** Current bank interest, used as the fixed rate for customers and the fund (percent per year). */
export const bankRate = (): number | null => findOption('setting', 'bank_rate')?.extra.rate ?? null

/** When on, data in closed periods can be created, edited and deleted (admin switch in settings). */
export const closedEditsAllowed = (): boolean => findOption('setting', 'allow_closed_edit')?.extra.on === true
