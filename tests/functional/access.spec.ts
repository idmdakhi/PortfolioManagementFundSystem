import { test } from '@japa/runner'
import User from '#models/user'
import Period from '#models/period'
import Dividend from '#models/dividend'
import Transaction from '#models/transaction'
import AuditLog from '#models/audit_log'
import { resetData, seedFund } from '../integration/helpers.js'
import { Client } from './http.js'
import db from '@adonisjs/lucid/services/db'

const PASS = 'Correct-Horse-Battery-1'
let n = 0
const unique = () => `${Date.now()}-${++n}`

async function setup(role: 'admin' | 'viewer') {
  const email = `${role}-${unique()}@example.com`
  await User.create({ email, password: PASS, role, fullName: role })
  const c = new Client()
  const r = await c.login(email, PASS)
  return { c, email, r }
}

test.group('access control over HTTP', (group) => {
  group.each.setup(async () => {
    await resetData()
    await db.from('users').delete()
  })

  test('anonymous users are sent to the login page and cannot post', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    const c = new Client()
    assert.equal((await c.get('/')).location, '/login')
    assert.equal((await c.get('/transactions/export')).location, '/login')
    const r = await c.post('/transactions', { investorId: String(investors[0].id), type: 'issue', amount: '1000', occurredOn: '1405/07/01' })
    assert.notEqual(r.status, 200)
    assert.equal((await Transaction.query()).length, 0)
  })

  test('a viewer can read reports but cannot change data or open admin pages', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    const { c } = await setup('viewer')
    for (const path of ['/', '/transactions', '/reconciliation', '/transactions/export']) assert.equal((await c.get(path)).status, 200, path)
    for (const path of ['/audit', '/backup', '/settings']) assert.equal((await c.get(path)).location, '/', `${path} must be refused`)
    const r = await c.post('/transactions', { investorId: String(investors[0].id), type: 'issue', amount: '5000', occurredOn: '1405/07/01' }, '/transactions')
    assert.include((await c.flashAfter(r)).join(' '), 'اجازه')
    assert.equal((await Transaction.query()).length, 0)
    const row = await AuditLog.query().where('path', '/transactions').firstOrFail()
    assert.equal(row.outcome, 'rejected', 'the refused attempt is in the audit trail')
  })
})

test.group('write rules over HTTP (admin)', (group) => {
  group.each.setup(async () => {
    await resetData()
    await db.from('users').delete()
  })

  test('the same successful form sent twice is recorded once; a refused one can be retried', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    const { c } = await setup('admin')
    const id = String(investors[0].id)
    const ok = { investorId: id, type: 'issue', amount: '250000', occurredOn: '1405/07/01' }
    assert.include((await c.flashAfter(await c.post('/transactions', ok, '/transactions'))).join(' '), 'ثبت شد')
    assert.include((await c.flashAfter(await c.post('/transactions', ok, '/transactions'))).join(' '), 'تکراری')
    assert.equal((await Transaction.query()).length, 1)

    const tooMuch = { investorId: id, type: 'redeem', amount: '900000000000', occurredOn: '1405/07/01' }
    for (let i = 0; i < 2; i++) assert.include((await c.flashAfter(await c.post('/transactions', tooMuch, '/transactions'))).join(' '), 'واحدهای کافی')
    assert.equal((await Transaction.query()).length, 1)
  })

  test('a transaction leaves a before/after row in the audit trail', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    const { c, email } = await setup('admin')
    await c.post('/transactions', { investorId: String(investors[0].id), type: 'issue', amount: '1000', occurredOn: '1405/07/01' }, '/transactions')
    const row = await AuditLog.query().where('action', 'transaction.create').firstOrFail()
    assert.equal(row.userEmail, email)
    assert.equal(JSON.parse(row.after!).amount, 1000)
  })

  test('closed periods are locked for dividends, and invalid input shows a message', async ({ assert }) => {
    await seedFund(1_000_000, [['A', 1000]])
    await Period.create({
      label: 'old', startOn: '2025-03-21', endOn: '2026-03-20', status: 'closed', months: 12, beginMarket: 1, openingDeposits: 0,
      openingWithdrawals: 0, marketValueBase: 1, valuationOn: '2026-03-20', fixedRate: 20, mgmtRate: 1, excessRate: 10, feeCap: 100,
      discount: 0, mgmtRate2: 1, excessRate2: 20,
    })
    const { c } = await setup('admin')
    const inClosed = await c.post('/dividends', { scope: 'fund', amount: '5000', occurredOn: '1404/06/01' }, '/dividends')
    assert.include((await c.flashAfter(inClosed)).join(' '), 'قابل ویرایش')
    assert.equal((await Dividend.query()).length, 0)
    const inOpen = await c.post('/dividends', { scope: 'fund', amount: '5000', occurredOn: '1405/06/01' }, '/dividends')
    assert.include((await c.flashAfter(inOpen)).join(' '), 'ثبت شد')

    const bad = { label: 'T1', startJalali: '1405/01/01', endJalali: '1405/12/29', months: '12', beginMarket: '1', openingDeposits: '0', openingWithdrawals: '0', fixedRate: '20', mgmtRate: '-5', excessRate: '10', feeCap: '100', discount: '0', mgmtRate2: '1', excessRate2: '20' }
    for (let i = 0; i < 2; i++) assert.include((await c.flashAfter(await c.post('/settings', bad, '/settings'))).join(' '), 'mgmtRate')
  })

  test('a period with a reconciliation error is not closed, unless the admin forces it (and it is logged)', async ({ assert }) => {
    const { period, investors } = await seedFund(1_000_000, [['A', 1000]])
    await Transaction.create({ investorId: investors[0].id, type: 'issue', amount: 100_000, nav: 1000, units: 7, occurredOn: '2026-04-01' })
    const { c } = await setup('admin')

    const refused = await c.post('/settings/close', {}, '/settings')
    assert.include((await c.flashAfter(refused)).join(' '), 'بستن دوره رد شد')
    assert.equal((await Period.findOrFail(period.id)).status, 'open')

    await c.post('/settings/close', { force: 'on' }, '/settings')
    assert.equal((await Period.findOrFail(period.id)).status, 'closed')
    const row = await AuditLog.query().where('action', 'period.close.forced').firstOrFail()
    assert.include(row.detail!, 'tx-units-consistent')
  })

  test('a clean period closes without force and the next one opens', async ({ assert }) => {
    const { period } = await seedFund(1_000_000, [['A', 1000]])
    const { c } = await setup('admin')
    await c.post('/settings/close', {}, '/settings')
    assert.equal((await Period.findOrFail(period.id)).status, 'closed')
    assert.equal((await Period.query().where('status', 'open')).length, 1)
    assert.isNull(await AuditLog.query().where('action', 'period.close.forced').first())
  })
})

test.group('login over HTTP', (group) => {
  group.each.setup(async () => {
    await resetData()
    await db.from('users').delete()
  })

  test('repeated wrong passwords lock the account for a while, even with the right password', async ({ assert }) => {
    const email = `lock-${unique()}@example.com`
    await User.create({ email, password: PASS, role: 'admin' })
    const c = new Client()
    for (let i = 0; i < 5; i++) assert.include((await c.flashAfter(await c.login(email, 'wrong-' + i))).join(' '), 'درست نیست')
    assert.include((await c.flashAfter(await c.login(email, PASS))).join(' '), 'تلاش‌های ناموفق')
    assert.equal((await c.get('/')).location, '/login')
    const events = (await AuditLog.query().where('user_email', email)).map((r) => r.action)
    assert.include(events, 'login.failed')
    assert.include(events, 'login.blocked')
  })

  test('a database without any period shows an explanation instead of crashing', async ({ assert }) => {
    const { c } = await setup('admin')
    const page = await c.get('/')
    assert.equal(page.status, 200)
    assert.include(page.html, 'دورهٔ مالی تعریف نشده')
  })

  test('a correct login works and is audited', async ({ assert }) => {
    await seedFund(1_000_000, [['A', 1000]])
    const { c, email, r } = await setup('admin')
    assert.equal(r.location, '/')
    assert.equal((await c.get('/')).status, 200)
    assert.isNotNull(await AuditLog.query().where('action', 'login.ok').where('user_email', email).first())
  })
})
