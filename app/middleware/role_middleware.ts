import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { roles: string[] }) {
    const user = ctx.auth.user
    if (!user || !options.roles.includes(user.role)) {
      ctx.session.flash('error', 'اجازهٔ این کار را ندارید.')
      return ctx.response.redirect('/')
    }
    return next()
  }
}
