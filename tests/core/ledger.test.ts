import { describe, expect, it } from 'vitest'
import {
  assertUnitsBalance, buildReversal, capitalDelta, checkEntryAgainstAccount, parseNewEntry, unitsDeltaMicro
} from '../../core/ledger'
import { toMicro, fromMicro } from '../../core/money'
import { reqRial, reqUnitsMicro, reqDate } from '../../core/validation'

const valid = { accountId: 1, type: 'deposit', amount: 1000, units: 2.5, date: '2026-03-01' }

describe('money', () => {
  it('round-trips micro-units without float drift', () => {
    expect(toMicro(0.1 + 0.2)).toBe(300000)
    expect(fromMicro(toMicro(12.345678))).toBe(12.345678)
  })
})

describe('input validation', () => {
  it('rials must be whole, positive, safe integers', () => {
    expect(reqRial(1000, 'x')).toBe(1000)
    for (const bad of [0, -1, 10.5, NaN, Infinity, '5', null, Number.MAX_SAFE_INTEGER + 1]) expect(() => reqRial(bad, 'x')).toThrow()
    expect(reqRial(0, 'x', true)).toBe(0)
  })
  it('units allow at most 6 decimals', () => {
    expect(reqUnitsMicro(1.5, 'u')).toBe(1_500_000)
    expect(() => reqUnitsMicro(0, 'u')).toThrow()
    expect(() => reqUnitsMicro(1.1234567, 'u')).toThrow()
  })
  it('dates must be real calendar dates', () => {
    expect(reqDate('2026-02-28', 'd')).toBe('2026-02-28')
    expect(() => reqDate('2026-02-30', 'd')).toThrow()
    expect(() => reqDate('26-02-28', 'd')).toThrow()
  })
})

describe('parseNewEntry', () => {
  it('parses a valid entry into integers', () => {
    const e = parseNewEntry(valid)
    expect(e).toMatchObject({ accountId: 1, type: 'deposit', amount: 1000, unitsMicro: 2_500_000, date: '2026-03-01' })
  })
  it('rejects bad input', () => {
    expect(() => parseNewEntry(null)).toThrow()
    expect(() => parseNewEntry({ ...valid, amount: 10.5 })).toThrow()
    expect(() => parseNewEntry({ ...valid, type: 'bogus' })).toThrow()
    expect(() => parseNewEntry({ ...valid, accountId: 'x' })).toThrow()
  })
})

describe('account rules', () => {
  const fund = { type: 'fund_share', isActive: true }
  const personal = { type: 'personal', isActive: true }
  it('fund_share deposit/withdraw needs units', () => {
    expect(() => checkEntryAgainstAccount(parseNewEntry({ ...valid, units: undefined }), fund)).toThrow(/واحد/)
    expect(() => checkEntryAgainstAccount(parseNewEntry(valid), fund)).not.toThrow()
  })
  it('units only on deposit/withdraw; personal accounts need none; inactive refused', () => {
    expect(() => checkEntryAgainstAccount(parseNewEntry({ ...valid, type: 'dividend' }), personal)).toThrow()
    expect(() => checkEntryAgainstAccount(parseNewEntry({ ...valid, units: undefined }), personal)).not.toThrow()
    expect(() => checkEntryAgainstAccount(parseNewEntry(valid), { ...fund, isActive: false })).toThrow(/غیرفعال/)
  })
})

describe('deltas and balance', () => {
  it('signs deposits and withdrawals', () => {
    expect(unitsDeltaMicro('deposit', 5)).toBe(5)
    expect(unitsDeltaMicro('withdraw', 5)).toBe(-5)
    expect(unitsDeltaMicro('dividend', null)).toBe(0)
    expect(capitalDelta('deposit', 10)).toBe(10)
    expect(capitalDelta('withdraw', 10)).toBe(-10)
    expect(capitalDelta('fee', 10)).toBe(0)
  })
  it('balance cannot go negative', () => {
    expect(assertUnitsBalance(10, -10)).toBe(0)
    expect(() => assertUnitsBalance(10, -11)).toThrow(/کافی نیست/)
  })
})

describe('buildReversal', () => {
  const orig = { id: 7, accountId: 1, type: 'deposit', amount: 1000, unitsMicro: 5, date: '2026-03-01', relatedAssetId: null, relatedTransactionId: null }
  it('negates amount and units and links to the original', () => {
    const r = buildReversal(orig, '2026-03-05')
    expect(r).toMatchObject({ amount: -1000, unitsMicro: -5, relatedTransactionId: 7, type: 'deposit', date: '2026-03-05' })
  })
  it('refuses to reverse a reversal', () => {
    expect(() => buildReversal({ ...orig, amount: -1000 }, '2026-03-05')).toThrow()
  })
})
