import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator } from '#validators/fund'
import { loginThrottle } from '#services/login_throttle'
import { audit } from '#services/audit'

export default class AuthController {
  show({ view }: HttpContext) {
    return view.render('pages/login')
  }

  async login(ctx: HttpContext) {
    const { request, auth, response, session } = ctx
    const { email, password } = await request.validateUsing(loginValidator)
    const ip = request.ip()
    const wait = loginThrottle.retryAfter(ip, email)
    if (wait > 0) {
      await audit.event(ctx, { action: 'login.blocked', outcome: 'blocked', email })
      session.flash('error', `تلاش‌های ناموفق زیاد بوده است. حدود ${Math.ceil(wait / 60).toLocaleString('fa-IR')} دقیقهٔ دیگر دوباره تلاش کنید.`)
      return response.redirect('/login')
    }
    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
      loginThrottle.success(ip, email)
      await audit.event(ctx, { action: 'login.ok', outcome: 'ok', email })
      return response.redirect('/')
    } catch {
      loginThrottle.fail(ip, email)
      await audit.event(ctx, { action: 'login.failed', outcome: 'rejected', email })
      session.flash('error', 'ایمیل یا گذرواژه درست نیست.')
      return response.redirect('/login')
    }
  }

  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect('/login')
  }
}
