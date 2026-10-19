/** Rules for the admin password. Returns a Persian message, or null when the password is acceptable. */
export const KNOWN_DEFAULTS = ['ChangeMe-123', 'admin', 'password', '12345678']

export function passwordProblem(pw: string | undefined | null): string | null {
  if (!pw) return 'گذرواژه خالی است.'
  if (KNOWN_DEFAULTS.includes(pw)) return 'این گذرواژهٔ پیش‌فرض/رایج است؛ یک گذرواژهٔ تازه انتخاب کنید.'
  if (pw.length < 12) return 'گذرواژه باید حداقل ۱۲ نویسه باشد.'
  if (/^(.)\1+$/.test(pw)) return 'گذرواژه نباید یک نویسهٔ تکراری باشد.'
  return null
}
