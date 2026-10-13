import type { HttpContext } from '@adonisjs/core/http'
import { loadState } from '#services/fund_state'

export default class DashboardController {
  async index({ view }: HttpContext) {
    const st = await loadState()
    return view.render('pages/dashboard', { nav: 'dash', st })
  }
}
