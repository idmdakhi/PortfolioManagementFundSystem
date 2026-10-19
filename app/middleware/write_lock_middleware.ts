import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { withWriteLock } from '#services/write_lock'

/** Runs every state-changing request one at a time. Reads are never blocked. */
export default class WriteLockMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const method = ctx.request.method()
    if (method === 'GET' || method === 'HEAD') return next()
    return withWriteLock(() => next())
  }
}
