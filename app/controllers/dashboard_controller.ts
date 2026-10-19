import type { HttpContext } from '@adonisjs/core/http'
import { loadState } from '#services/fund_state'
import { reconcile } from '#services/reconcile'
import { todayIso } from '#services/jalali'

export default class DashboardController {
  async index({ view, request }: HttpContext) {
    const st = await loadState()
    const pid = Number(request.input('p'))
    const rep = st.reports.find((r) => r.period.id === pid) ?? st.current
    return view.render('pages/dashboard', { nav: 'dash', st, rep, rec: reconcile(st, todayIso()) })
  }
}
