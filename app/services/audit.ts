import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import AuditLog from '#models/audit_log'

/**
 * Audit trail (docs/Ledger.md). Failing to write an audit row must never break the user's request,
 * so errors are logged and swallowed; the write itself is a plain insert.
 */
const SECRET_KEY = /pass|token|csrf|secret/i
const MAX_VALUE = 500

type Ctx = Pick<HttpContext, 'auth' | 'request'>
export interface Who {
  userId: number | null
  userEmail: string | null
  ip: string | null
}

export const whoOf = (ctx: Ctx): Who => ({
  userId: ctx.auth?.user?.id ?? null,
  userEmail: ctx.auth?.user?.email ?? null,
  ip: ctx.request.ip() ?? null,
})

/** Form body for the log: secrets masked, framework fields (_csrf, _method) dropped, long values cut. */
export function sanitizeBody(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (k.startsWith('_')) continue
    if (SECRET_KEY.test(k)) out[k] = '***'
    else out[k] = typeof v === 'string' && v.length > MAX_VALUE ? v.slice(0, MAX_VALUE) + '…' : v
  }
  return out
}

const json = (v: unknown) => (v === undefined || v === null ? null : JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? Number(x) : x)))

async function insert(row: Partial<AuditLog> & { kind: string; action: string }) {
  try {
    await AuditLog.create(row)
  } catch (e) {
    logger.error({ err: e }, 'audit write failed')
  }
}

export const audit = {
  /** One row per state-changing HTTP request. */
  request(ctx: Ctx & Pick<HttpContext, 'route'>, outcome: string) {
    const method = ctx.request.method()
    return insert({
      kind: 'request', ...whoOf(ctx), method, path: ctx.request.url(),
      action: `${method} ${ctx.route?.pattern ?? ctx.request.url()}`,
      detail: json(sanitizeBody(ctx.request.all())), outcome,
    })
  },

  /** Before/after snapshot of a financial record. `before` null = created, `after` null = deleted. */
  change(ctx: Ctx, c: { action: string; entity: string; entityId: string | number | null; before?: unknown; after?: unknown; detail?: unknown }) {
    return insert({
      kind: 'change', ...whoOf(ctx), method: ctx.request.method(), path: ctx.request.url(),
      action: c.action, entity: c.entity, entityId: c.entityId === null ? null : String(c.entityId),
      before: json(c.before), after: json(c.after), detail: json(c.detail), outcome: 'ok',
    })
  },

  /** Events outside the normal request flow (login attempts). */
  event(ctx: Ctx, e: { action: string; outcome: string; email?: string | null; detail?: unknown }) {
    return insert({
      kind: 'request', ...whoOf(ctx), userEmail: whoOf(ctx).userEmail ?? e.email ?? null,
      method: ctx.request.method(), path: ctx.request.url(), action: e.action, outcome: e.outcome, detail: json(e.detail),
    })
  },
}
