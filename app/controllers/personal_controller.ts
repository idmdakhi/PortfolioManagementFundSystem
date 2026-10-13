import type { HttpContext } from '@adonisjs/core/http'
import { loadState } from '#services/fund_state'

export default class PersonalController {
  /** Overview of all personal accounts, separate from the fund. */
  async index({ view }: HttpContext) {
    const st = await loadState()
    return view.render('pages/personal', { nav: 'ps', st, rep: st.current })
  }
}
