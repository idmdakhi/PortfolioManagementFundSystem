/** Small, dependency-free input validators for IPC payloads (renderer input is untrusted). */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function requireObject(v: unknown, name = 'data'): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ValidationError(`${name} نامعتبر است`)
  return v as Record<string, unknown>
}

export function reqString(v: unknown, name: string, max = 200): string {
  if (typeof v !== 'string' || !v.trim()) throw new ValidationError(`${name} الزامی است`)
  const s = v.trim()
  if (s.length > max) throw new ValidationError(`${name} بیش از ${max} نویسه است`)
  return s
}

export function optString(v: unknown, name: string, max = 2000): string | null {
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string') throw new ValidationError(`${name} نامعتبر است`)
  const s = v.trim()
  if (s.length > max) throw new ValidationError(`${name} بیش از ${max} نویسه است`)
  return s || null
}

export function reqInt(v: unknown, name: string, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new ValidationError(`${name} نامعتبر است`)
  return v
}

export function optInt(v: unknown, name: string, min = 1): number | null {
  if (v === undefined || v === null || v === '') return null
  return reqInt(v, name, min)
}

export function reqNumber(v: unknown, name: string, opts: { min?: number; max?: number; positive?: boolean } = {}): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ValidationError(`${name} باید عدد باشد`)
  if (opts.positive && v <= 0) throw new ValidationError(`${name} باید بزرگ‌تر از صفر باشد`)
  if (opts.min !== undefined && v < opts.min) throw new ValidationError(`${name} نباید کمتر از ${opts.min} باشد`)
  if (opts.max !== undefined && v > opts.max) throw new ValidationError(`${name} نباید بیشتر از ${opts.max} باشد`)
  return v
}

export function reqEnum<T extends string>(v: unknown, allowed: readonly T[], name: string): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) throw new ValidationError(`${name} نامعتبر است`)
  return v as T
}

export function reqBool(v: unknown, name: string): boolean {
  if (typeof v !== 'boolean') throw new ValidationError(`${name} نامعتبر است`)
  return v
}

/** Strict YYYY-MM-DD that is also a real calendar date. */
export function reqDate(v: unknown, name: string): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new ValidationError(`${name} نامعتبر است`)
  const t = Date.parse(`${v}T00:00:00Z`)
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== v) throw new ValidationError(`${name} نامعتبر است`)
  return v
}

/** Copy only whitelisted keys, so callers can never write arbitrary columns. */
export function pickAllowed(data: Record<string, unknown>, allowed: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of allowed) if (k in data && data[k] !== undefined) out[k] = data[k]
  return out
}
