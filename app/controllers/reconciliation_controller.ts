import type { HttpContext } from '@adonisjs/core/http'
import { loadState } from '#services/fund_state'
import { reconcile } from '#services/reconcile'
import { todayIso } from '#services/jalali'

export default class ReconciliationController {
  async index({ view }: HttpContext) {
    const st = await loadState()
    return view.render('pages/reconciliation', { nav: 'rec', st, rec: reconcile(st, todayIso()) })
  }
}
