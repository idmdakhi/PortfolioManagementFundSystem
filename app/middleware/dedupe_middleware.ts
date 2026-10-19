import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { DuplicateGuard, duplicateGuard } from '#services/duplicate_guard'
import { flashProblem } from '#services/flash_state'

/** Must run inside the write lock, so two identical simultaneous requests are decided in order. */
export default class DedupeMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const method = ctx.request.method()
    const multipart = (ctx.request.header('content-type') || '').startsWith('multipart/')
    if (method === 'GET' || method === 'HEAD' || multipart) return next()

    const key = DuplicateGuard.fingerprint(ctx.auth.user?.id ?? null, method, ctx.request.url(), ctx.request.all())
    if (duplicateGuard.isDuplicate(key)) {
      ctx.session.flash('error', 'این درخواست همین چند ثانیه پیش با موفقیت ثبت شده است؛ ثبت تکراری انجام نشد. فهرست را بررسی کنید.')
      return ctx.response.redirect().back()
    }
    const result = await next()
    // A refused request (business error or invalid input) does not count, so the user can retry at once.
    if (!flashProblem(ctx.session)) duplicateGuard.remember(key)
    return result
  }
}
