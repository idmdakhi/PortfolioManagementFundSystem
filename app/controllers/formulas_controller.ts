import type { HttpContext } from '@adonisjs/core/http'
import { loadState } from '#services/fund_state'

export default class FormulasController {
  async show({ view }: HttpContext) {
    const st = await loadState()
    return view.render('pages/formulas', { nav: 'fm', st, rep: st.current })
  }
}
