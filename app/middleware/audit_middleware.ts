import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { audit } from '#services/audit'
import { flashProblem } from '#services/flash_state'

/** Outermost write-side middleware: logs every state-changing request with its outcome. */
export default class AuditMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const method = ctx.request.method()
    if (method === 'GET' || method === 'HEAD') return next()
    let outcome = 'ok'
    try {
      const result = await next()
      outcome = flashProblem(ctx.session) ?? 'ok'
      return result
    } catch (e) {
      outcome = (e as { status?: number }).status === 422 ? 'invalid' : 'error'
      throw e
    } finally {
      await audit.request(ctx, outcome)
    }
  }
}
