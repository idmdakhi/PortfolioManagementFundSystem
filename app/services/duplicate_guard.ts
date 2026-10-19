import { createHash } from 'node:crypto'

/**
 * Remembers requests that already succeeded, so the same form sent twice in a row
 * (double click, refresh after submit) is not recorded twice (docs/DECISIONS.md D-06).
 */
export class DuplicateGuard {
  private seen = new Map<string, number>()

  constructor(
    private windowMs = 15_000,
    private now: () => number = Date.now
  ) {}

  static fingerprint(userId: number | null, method: string, path: string, body: Record<string, unknown>) {
    const clean = Object.keys(body)
      .filter((k) => !k.startsWith('_'))
      .sort()
      .map((k) => [k, body[k]])
    return createHash('sha256').update(JSON.stringify([userId, method, path, clean])).digest('hex')
  }

  isDuplicate(key: string) {
    const t = this.seen.get(key)
    if (t === undefined) return false
    if (this.now() - t >= this.windowMs) {
      this.seen.delete(key)
      return false
    }
    return true
  }

  /** Call only after the request succeeded. */
  remember(key: string) {
    const cutoff = this.now() - this.windowMs
    for (const [k, t] of this.seen) if (t <= cutoff) this.seen.delete(k)
    this.seen.set(key, this.now())
  }
}

export const duplicateGuard = new DuplicateGuard()
