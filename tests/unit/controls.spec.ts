import { test } from '@japa/runner'
import { toCsv, csvCell } from '#services/csv'
import { LoginThrottle } from '#services/login_throttle'
import { DuplicateGuard } from '#services/duplicate_guard'
import { withWriteLock } from '#services/write_lock'
import { sanitizeBody } from '#services/audit'
import DedupeMiddleware from '#middleware/dedupe_middleware'
import { flashProblem } from '#services/flash_state'
import { passwordProblem } from '#services/password_policy'

const run = async (flashError: boolean | 'invalid', body: Record<string, unknown>) => {
  const flashes: string[] = []
  let calls = 0
  const ctx = {
    request: { method: () => 'POST', url: () => '/dup-test', header: () => 'application/x-www-form-urlencoded', all: () => body },
    auth: { user: { id: 99 } },
    session: { flash: (_k: string, m: string) => flashes.push(m), responseFlashMessages: { all: () => (flashError === true ? { error: 'x' } : flashError === 'invalid' ? { errorsBag: { E_VALIDATION_ERROR: 'x' }, inputErrorsBag: { amount: ['bad'] } } : {}) } },
    response: { redirect: () => ({ back: () => 'redirected' }) },
  } as never
  const out = await new DedupeMiddleware().handle(ctx, async () => (calls++, 'handled'))
  return { out, calls, flashes }
}

test.group('csv', () => {
  test('BOM, CRLF, quoting', ({ assert }) => {
    const out = toCsv([['a', 'b,c'], ['say "hi"', 'x\ny']])
    assert.isTrue(out.startsWith('\uFEFF'))
    assert.equal(out, '\uFEFFa,"b,c"\r\n"say ""hi""","x\ny"\r\n')
  })
  test('formula injection is neutralised for text, numbers stay numbers', ({ assert }) => {
    assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`)
    assert.equal(csvCell('+1'), "'+1")
    assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)")
    assert.equal(csvCell('-cmd'), "'-cmd")
    assert.equal(csvCell(-1500), '-1500')
    assert.equal(csvCell(null), '')
  })
})

test.group('login throttle', () => {
  test('blocks after 5 failures for the same account and releases after the window', ({ assert }) => {
    let now = 0
    const t = new LoginThrottle(5, 20, 600_000, () => now)
    for (let i = 0; i < 4; i++) t.fail('1.1.1.1', 'A@x.com')
    assert.equal(t.retryAfter('1.1.1.1', 'a@x.com'), 0)
    t.fail('1.1.1.1', 'a@x.com')
    assert.isAbove(t.retryAfter('1.1.1.1', 'a@x.com'), 0)
    assert.equal(t.retryAfter('1.1.1.1', 'other@x.com'), 0, 'another account is not blocked')
    now = 601_000
    assert.equal(t.retryAfter('1.1.1.1', 'a@x.com'), 0)
  })
  test('one ip trying many accounts is blocked at the ip limit; success clears the account bucket', ({ assert }) => {
    const t = new LoginThrottle(5, 6, 600_000, () => 0)
    for (let i = 0; i < 6; i++) t.fail('2.2.2.2', `u${i}@x.com`)
    assert.isAbove(t.retryAfter('2.2.2.2', 'new@x.com'), 0)
    const t2 = new LoginThrottle(2, 20, 600_000, () => 0)
    t2.fail('3.3.3.3', 'a@x.com')
    t2.success('3.3.3.3', 'a@x.com')
    t2.fail('3.3.3.3', 'a@x.com')
    assert.equal(t2.retryAfter('3.3.3.3', 'a@x.com'), 0)
  })
})

test.group('duplicate guard', () => {
  test('same request inside the window is a duplicate, different body or later is not', ({ assert }) => {
    let now = 0
    const g = new DuplicateGuard(15_000, () => now)
    const k = DuplicateGuard.fingerprint(1, 'POST', '/transactions', { amount: '5', _csrf: 'a' })
    assert.isFalse(g.isDuplicate(k))
    g.remember(k)
    assert.isTrue(g.isDuplicate(DuplicateGuard.fingerprint(1, 'POST', '/transactions', { _csrf: 'b', amount: '5' })), 'csrf token and key order do not matter')
    assert.isFalse(g.isDuplicate(DuplicateGuard.fingerprint(1, 'POST', '/transactions', { amount: '6' })))
    assert.isFalse(g.isDuplicate(DuplicateGuard.fingerprint(2, 'POST', '/transactions', { amount: '5' })), 'other user')
    now = 15_001
    assert.isFalse(g.isDuplicate(k))
  })

  test('middleware: second identical successful request is refused with a message', async ({ assert }) => {
    const body = { amount: '777', n: Math.random() }
    assert.equal((await run(false, body)).out, 'handled')
    const second = await run(false, body)
    assert.equal(second.out, 'redirected')
    assert.equal(second.calls, 0)
    assert.lengthOf(second.flashes, 1)
  })
  test('middleware: a request that was rejected can be retried immediately', async ({ assert }) => {
    const body = { amount: '888', n: Math.random() }
    assert.equal((await run(true, body)).out, 'handled')
    assert.equal((await run(false, body)).out, 'handled')
  })
})

test.group('flash state', () => {
  const sess = (o: Record<string, unknown>) => ({ responseFlashMessages: { all: () => o } })
  test('classifies business errors, validation errors and success', ({ assert }) => {
    assert.isNull(flashProblem(sess({ ok: 'saved' })))
    assert.equal(flashProblem(sess({ error: 'no' })), 'rejected')
    assert.equal(flashProblem(sess({ inputErrorsBag: { mgmtRate: ['x'] }, mgmtRate: '-5' })), 'invalid')
    assert.equal(flashProblem(sess({ errorsBag: { E_VALIDATION_ERROR: 'x' } })), 'invalid')
  })
  test('middleware: invalid input is not remembered as a success', async ({ assert }) => {
    const body = { amount: '999', n: Math.random() }
    assert.equal((await run('invalid', body)).out, 'handled')
    assert.equal((await run(false, body)).out, 'handled')
  })
})

test.group('write lock', () => {
  test('runs tasks strictly one after another, even when one throws', async ({ assert }) => {
    const log: string[] = []
    const task = (n: string, ms: number, fail = false) => withWriteLock(async () => {
      log.push('start ' + n)
      await new Promise((r) => setTimeout(r, ms))
      log.push('end ' + n)
      if (fail) throw new Error('x')
    })
    const results = await Promise.allSettled([task('a', 20, true), task('b', 5), task('c', 1)])
    assert.deepEqual(log, ['start a', 'end a', 'start b', 'end b', 'start c', 'end c'])
    assert.deepEqual(results.map((r) => r.status), ['rejected', 'fulfilled', 'fulfilled'])
  })
})

test.group('audit body sanitising', () => {
  test('masks secrets, drops framework fields, cuts long values', ({ assert }) => {
    const out = sanitizeBody({ password: 'p', newPassword: 'q', _csrf: 'z', note: 'x'.repeat(600), amount: '5' })
    assert.equal(out.password, '***')
    assert.equal(out.newPassword, '***')
    assert.notProperty(out, '_csrf')
    assert.lengthOf(out.note as string, 501)
    assert.equal(out.amount, '5')
  })
})

test.group('password policy', () => {
  test('rejects empty, default, common, short and repeated passwords; accepts a long one', ({ assert }) => {
    for (const bad of ['', undefined, 'ChangeMe-123', 'admin', 'short-1', 'aaaaaaaaaaaaaaaa']) assert.isNotNull(passwordProblem(bad as string), String(bad))
    assert.isNull(passwordProblem('Correct-Horse-Battery-1'))
  })
})
