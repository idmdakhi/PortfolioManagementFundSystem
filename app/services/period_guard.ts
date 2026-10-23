import type { State } from '#services/fund_state'

export const NOT_EDITABLE = 'تاریخ باید داخل یک دورهٔ مالیِ قابل ویرایش (دورهٔ باز) باشد؛ داده‌های دوره‌های بسته قفل‌اند.'
export const CLOSED_LOCKED = 'این مورد در دورهٔ بسته است و قفل شده؛ داده‌های دوره‌های بسته قابل ویرایش یا حذف نیستند.'

/** The period report that contains an ISO date. */
export const reportOf = (st: State, date: string) => st.reports.find((r) => date >= r.period.startOn && date <= r.period.endOn)

/** May data dated `date` be created, edited or deleted? Only inside an open period; closed periods are final. */
export function canEdit(st: State, date: string) {
  const r = reportOf(st, date)
  return !!r && r.period.status === 'open'
}
