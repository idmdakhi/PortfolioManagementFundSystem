import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'

const PAGE = 100

export default class AuditController {
  /** Admin only. Filters: kind (request|change), outcome, q (matches action, path, email or entity id). */
  async index({ view, request }: HttpContext) {
    const kind = String(request.input('kind', ''))
    const outcome = String(request.input('outcome', ''))
    const q = String(request.input('q', '')).trim()
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const query = AuditLog.query().orderBy('id', 'desc')
    if (kind === 'request' || kind === 'change') query.where('kind', kind)
    if (outcome) query.where('outcome', outcome)
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, (c) => '\\' + c)}%`
      query.where((w) => {
        w.whereRaw("action like ? escape '\\'", [like]).orWhereRaw("path like ? escape '\\'", [like])
          .orWhereRaw("user_email like ? escape '\\'", [like]).orWhereRaw("entity_id like ? escape '\\'", [like])
      })
    }
    const total = Number((await query.clone().clearOrder().count('* as n').first())?.$extras.n ?? 0)
    const rows = await query.offset((page - 1) * PAGE).limit(PAGE)
    return view.render('pages/audit', { nav: 'au', rows, kind, outcome, q, page, pages: Math.max(1, Math.ceil(total / PAGE)), total })
  }
}
