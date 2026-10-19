import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { passwordProblem } from '#services/password_policy'

/**
 * Changes a user's password without touching any other data:
 *   node ace user:password admin@example.com
 * The password is typed hidden (never on the command line, never in shell history).
 */
export default class UserPassword extends BaseCommand {
  static commandName = 'user:password'
  static description = 'Change a user password (asks for the new password, hidden)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'E-mail of the user' })
  declare email: string

  async run() {
    const { default: User } = await import('#models/user')
    const user = await User.findBy('email', this.email)
    if (!user) {
      this.logger.error(`No user with e-mail ${this.email}`)
      this.exitCode = 1
      return
    }
    const first = await this.prompt.secure('New password (min 12 characters)')
    const problem = passwordProblem(first)
    if (problem) {
      this.logger.error(problem)
      this.exitCode = 1
      return
    }
    if ((await this.prompt.secure('Repeat the password')) !== first) {
      this.logger.error('The two passwords are different. Nothing was changed.')
      this.exitCode = 1
      return
    }
    user.password = first
    await user.save()
    this.logger.success(`Password of ${user.email} changed.`)
  }
}
