import { describe, expect, it } from 'vitest'
import { freshDb } from './helpers'

// These bypass the application code on purpose: the DATABASE itself must refuse bad data.
describe('database-enforced integrity', () => {
  const ins = (s: ReturnType<typeof freshDb>, over: Record<string, unknown> = {}) => {
    const r = { account_id: s.fund, type: 'deposit', amount: 1000, units_micro: 5_000_000, date: '2026-03-01', ...over }
    return s.sqlite.prepare(
      'INSERT INTO transactions (account_id, type, amount, units_micro, date) VALUES (@account_id, @type, @amount, @units_micro, @date)'
    ).run(r)
  }

  it('accepts a normal entry and stores integer types', () => {
    const s = freshDb(); ins(s)
    const row = s.sqlite.prepare('SELECT typeof(amount) a, typeof(units_micro) u FROM transactions').get() as any
    expect(row).toEqual({ a: 'integer', u: 'integer' })
  })

  it('rejects fractional money / units, zero amounts, bad types and dates', () => {
    const s = freshDb()
    expect(() => ins(s, { amount: 10.5 })).toThrow()
    expect(() => ins(s, { amount: 0 })).toThrow()
    expect(() => ins(s, { units_micro: 1.5 })).toThrow()
    expect(() => ins(s, { type: 'bogus' })).toThrow()
    expect(() => ins(s, { date: '2026/03/01' })).toThrow()
    expect(() => ins(s, { type: 'dividend', units_micro: 5 })).toThrow() // units only on deposit/withdraw
  })

  it('ledger is append-only (no UPDATE, no DELETE)', () => {
    const s = freshDb(); ins(s)
    expect(() => s.sqlite.exec('UPDATE transactions SET amount = 1')).toThrow(/append-only/)
    expect(() => s.sqlite.exec('DELETE FROM transactions')).toThrow(/append-only/)
  })

  it('a unit balance cannot go negative', () => {
    const s = freshDb(); ins(s)
    expect(() => ins(s, { type: 'withdraw', units_micro: 5_000_001 })).toThrow(/negative/)
    expect(() => ins(s, { type: 'withdraw', units_micro: 5_000_000 })).not.toThrow()
  })

  it('no entries inside a closed fiscal period', () => {
    const s = freshDb()
    s.sqlite.exec("INSERT INTO fiscal_periods (name, start_date, end_date, is_closed) VALUES ('P','2026-01-01','2026-12-31',1)")
    expect(() => ins(s)).toThrow(/closed/)
    expect(() => ins(s, { date: '2027-01-01' })).not.toThrow()
  })

  it('valuations must be whole non-negative rials; foreign keys are enforced', () => {
    const s = freshDb()
    const v = (mv: number, acc = s.fund) =>
      s.sqlite.prepare('INSERT INTO valuations (account_id, date, market_value) VALUES (?, ?, ?)').run(acc, '2026-03-01', mv)
    expect(() => v(100.5)).toThrow()
    expect(() => v(-1)).toThrow()
    expect(() => v(100, 9999)).toThrow(/FOREIGN KEY/)
    expect(() => v(100)).not.toThrow()
  })
})
