import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { ensureOptions } from '#services/options'

/** Makes sure the option lists are cached before any view renders. */
export default class LoadOptionsMiddleware {
  async handle(_ctx: HttpContext, next: NextFn) {
    await ensureOptions()
    return next()
  }
}
