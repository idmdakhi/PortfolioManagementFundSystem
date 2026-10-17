import type { State } from '#services/fund_state'
import { closedEditsAllowed } from '#services/options'

export const NOT_EDITABLE =
  'تاریخ باید داخل یک دورهٔ مالی قابل ویرایش باشد: دورهٔ باز، یا دورهٔ بسته وقتی «ویرایش دوره‌های بسته» در تنظیمات روشن است.'

/** The period report that contains an ISO date. */
export const reportOf = (st: State, date: string) => st.reports.find((r) => date >= r.period.startOn && date <= r.period.endOn)

/** May data dated `date` be created, edited or deleted? Open periods always; closed ones only with the admin switch. */
export function canEdit(st: State, date: string) {
  const r = reportOf(st, date)
  return !!r && (r.period.status === 'open' || closedEditsAllowed())
}
