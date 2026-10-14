import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { latinDigits } from '#services/jalali'

const NUMERIC = new Set([
  'amount', 'nav', 'marketValue', 'beginValue', 'deposits', 'withdrawals', 'openingUnits', 'openingCost',
  'beginMarket', 'openingDeposits', 'openingWithdrawals', 'discount', 'months', 'feeCap',
  'fixedRate', 'mgmtRate', 'excessRate', 'mgmtRate2', 'excessRate2', 'investorId', 'periodId', 'total', 'roundTo', 'sort',
])
const DATES = new Set(['occurredOn', 'startJalali', 'endJalali', 'valuationOn', 'valuedOn'])

/** Accepts Persian digits, thousands separators and Persian decimal marks in form fields. */
export default class NormalizeInputMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const multipart = (ctx.request.header('content-type') || '').startsWith('multipart/')
    if (ctx.request.method() === 'POST' && !multipart) {
      const out: Record<string, unknown> = { ...ctx.request.all() }
      for (const [k, v] of Object.entries(out)) {
        if (typeof v !== 'string') continue
        if (NUMERIC.has(k) || k.startsWith('val_') || k.startsWith('w_')) out[k] = latinDigits(v).replace(/[,٬،\s]/g, '').replace(/٫/g, '.')
        else if (DATES.has(k)) out[k] = latinDigits(v).trim()
      }
      ctx.request.updateBody(out)
    }
    return next()
  }
}
