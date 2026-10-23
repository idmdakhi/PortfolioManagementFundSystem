import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { passwordProblem } from '#services/password_policy'
import User from '#models/user'
import Period from '#models/period'
export default class extends BaseSeeder {
  async run() {
    // The admin is created ONCE. Re-running the seeder never resets an existing password
    // (change it with `node ace user:password <email>`).
    const email = env.get('ADMIN_EMAIL', 'admin@admin.com')
    const password = env.get('ADMIN_PASSWORD', 'admin')
    if (!(await User.findBy('email', email))) {
      if (app.inProduction && passwordProblem(password)) {
        throw new Error(
          `ADMIN_PASSWORD is not acceptable for production: ${passwordProblem(password)}`
        )
      }
      await User.create({ fullName: 'مدیر', email, password, role: 'admin' })
    }
    if (await Period.first()) return
  }
}
