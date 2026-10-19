/**
 * In-memory limiter for failed logins. Two buckets: (ip + email) and ip alone.
 * The clock is injectable so the behaviour is unit-tested without waiting.
 */
export class LoginThrottle {
  private fails = new Map<string, number[]>()

  constructor(
    private perAccount = 5,
    private perIp = 20,
    private windowMs = 10 * 60 * 1000,
    private now: () => number = Date.now
  ) {}

  private keys(ip: string, email: string) {
    return [`a:${ip}|${email.trim().toLowerCase()}`, `i:${ip}`] as const
  }

  private recent(key: string) {
    const cutoff = this.now() - this.windowMs
    const list = (this.fails.get(key) ?? []).filter((t) => t > cutoff)
    if (list.length) this.fails.set(key, list)
    else this.fails.delete(key)
    return list
  }

  /** Seconds to wait, or 0 when the attempt may proceed. */
  retryAfter(ip: string, email: string): number {
    const [a, i] = this.keys(ip, email)
    let wait = 0
    for (const [key, max] of [[a, this.perAccount], [i, this.perIp]] as const) {
      const list = this.recent(key)
      if (list.length >= max) wait = Math.max(wait, Math.ceil((list[0] + this.windowMs - this.now()) / 1000))
    }
    return wait
  }

  fail(ip: string, email: string) {
    for (const key of this.keys(ip, email)) this.fails.set(key, [...this.recent(key), this.now()])
  }

  /** A good login clears the account bucket (the ip bucket keeps counting). */
  success(ip: string, email: string) {
    this.fails.delete(this.keys(ip, email)[0])
  }
}

export const loginThrottle = new LoginThrottle()
