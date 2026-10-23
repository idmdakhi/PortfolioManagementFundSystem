import { test } from '@japa/runner'
import User from '#models/user'
import Period from '#models/period'
import Dividend from '#models/dividend'
import Transaction from '#models/transaction'
import AuditLog from '#models/audit_log'
import Area from '#models/area'
import AreaEntry from '#models/area_entry'
import Movement from '#models/movement'
import FeeReceipt from '#models/fee_receipt'
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

test.group('group movements can be edited; closed periods stay locked', (group) => {
  group.each.setup(async () => {
    await resetData()
    await db.from('users').delete()
  })

  test('an area movement is edited in place (same batch, new amounts) and the change is logged', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000], ['B', 500]])
    const area = await Area.create({ name: 'Land', kind: 'property', marketValue: 0 })
    const { c } = await setup('admin')
    const body = (a: number, b: number) => ({
      from: 'external', to: `area:${area.id}`, method: 'amount', occurredOn: '1405/06/01', note: 'x',
      [`sel_${investors[0].id}`]: 'on', [`val_${investors[0].id}`]: String(a), [`sel_${investors[1].id}`]: 'on', [`val_${investors[1].id}`]: String(b),
    })
    assert.include((await c.flashAfter(await c.post('/movements', body(300, 200), '/movements'))).join(' '), 'ثبت شد')
    const meta = (await Movement.query())[0]
    const page = await c.get(`/movements/${meta.batchId}/edit`)
    assert.equal(page.status, 200)
    assert.include(page.html, '300')
    const r = await c.post(`/movements/${meta.batchId}`, body(700, 100), `/movements/${meta.batchId}/edit`)
    assert.include((await c.flashAfter(r)).join(' '), 'ویرایش شد')
    const entries = await AreaEntry.query().orderBy('investor_id')
    assert.lengthOf(entries, 2)
    assert.deepEqual(entries.map((e) => Number(e.amount)), [700, 100])
    assert.isTrue(entries.every((e) => e.batchId === meta.batchId))
    assert.equal((await Movement.query()).length, 1)
    assert.equal(Number((await Movement.findByOrFail('batchId', meta.batchId)).total), 800)
    assert.isAbove((await AuditLog.query().where('action', 'movement.update')).length, 0)
  })

  test('a fund movement, fee and dividend in a closed period cannot be edited or deleted', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    await Period.create({
      label: 'old', startOn: '2025-03-21', endOn: '2026-03-20', status: 'closed', months: 12, beginMarket: 1, openingDeposits: 0,
      openingWithdrawals: 0, marketValueBase: 1, valuationOn: '2026-03-20', fixedRate: 20, mgmtRate: 1, excessRate: 10, feeCap: 100,
      discount: 0, mgmtRate2: 1, excessRate2: 20,
    })
    const tx = await Transaction.create({ investorId: investors[0].id, type: 'issue', amount: 1000, nav: 1000, units: 1, occurredOn: '2025-06-01', batchId: 'B1' })
    await Movement.create({ batchId: 'B1', fromRef: 'ext:external', toRef: 'fund', method: 'amount', total: 1000, occurredOn: '2025-06-01' })
    const fee = await FeeReceipt.create({ scope: 'fund', investorId: null, amount: 5, occurredOn: '2025-06-01', method: 'record' })
    const div = await Dividend.create({ scope: 'fund', investorId: null, amount: 7, occurredOn: '2025-06-01' })
    const { c } = await setup('admin')
    const locked = (r: { location: string | null }) => c.flashAfter(r).then((m) => m.join(' '))
    assert.equal((await c.get('/movements/B1/edit')).status, 302)
    const edited = await c.post('/movements/B1', { from: 'external', to: 'fund', method: 'amount', occurredOn: '1405/06/01', [`sel_${investors[0].id}`]: 'on', [`val_${investors[0].id}`]: '5000' }, '/movements')
    assert.include(await locked(edited), 'قفل')
    assert.include(await locked(await c.post('/movements/B1/delete', {}, '/movements')), 'قفل')
    assert.include(await locked(await c.post(`/fees/${fee.id}/delete`, {}, '/dividends')), 'قفل')
    assert.include(await locked(await c.post(`/fees/${fee.id}`, { amount: '9', occurredOn: '1404/06/01', scope: 'fund' }, '/dividends')), 'قفل')
    assert.include(await locked(await c.post(`/fees/${fee.id}`, { amount: '9', occurredOn: '1405/06/01', scope: 'fund' }, '/dividends')), 'قفل')
    assert.include(await locked(await c.post(`/dividends/${div.id}/delete`, {}, '/movements')), 'قابل ویرایش')
    assert.equal(Number((await Transaction.findOrFail(tx.id)).amount), 1000)
    assert.equal((await Movement.query()).length, 1)
    assert.equal(Number((await FeeReceipt.findOrFail(fee.id)).amount), 5)
    assert.equal(Number((await Dividend.findOrFail(div.id)).amount), 7)
    // the old «allow closed edits» switch no longer exists
    assert.equal((await c.post('/settings/closed-edits', { on: 'on' }, '/settings')).status, 404)
  })
})

test.group('unit split over HTTP', (group) => {
  group.each.setup(async () => {
    await resetData()
    await db.from('users').delete()
  })

  test('the admin can split units so the NAV becomes 1000; a viewer cannot; it needs the confirmation box', async ({ assert }) => {
    const { investors } = await seedFund(22_292_000, [['A', 1000]])
    const viewer = await setup('viewer')
    assert.notEqual((await viewer.c.post('/settings/split', { target: '1000', confirm: 'on' }, '/')).status, 200)
    const { c } = await setup('admin')
    const noConfirm = await c.post('/settings/split', { target: '1000' }, '/settings')
    assert.include((await c.flashAfter(noConfirm)).join(' '), 'تأیید')
    assert.equal(Number((await db.from('investors').where('id', investors[0].id).first()).opening_units), 1000)
    const ok = await c.post('/settings/split', { target: '1000', confirm: 'on' }, '/settings')
    assert.include((await c.flashAfter(ok)).join(' '), 'تقسیم شد')
    const units = Number((await db.from('investors').where('id', investors[0].id).first()).opening_units)
    assert.approximately(units, 22292, 1e-6)
    assert.isAbove((await AuditLog.query().where('action', 'fund.unit_split')).length, 0)
    const again = await c.post('/settings/split', { target: '1,000', confirm: 'on' }, '/settings')
    assert.include((await c.flashAfter(again)).join(' '), 'نیازی به تقسیم نیست')
  })
})

test.group('fund and personal accounts are separate pages', (group) => {
  group.each.setup(async () => {
    await resetData()
    await db.from('users').delete()
  })

  test('dividends and fees: each page lists only its own scope, and writes go back to the right page', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['Alice', 1000]])
    await Dividend.create({ scope: 'fund', investorId: null, amount: 11111, occurredOn: '2026-04-01', note: 'fund-div' })
    await Dividend.create({ scope: 'personal', investorId: investors[0].id, amount: 22222, occurredOn: '2026-04-01', note: 'personal-div' })
    await FeeReceipt.create({ scope: 'fund', investorId: null, amount: 3333, occurredOn: '2026-04-01', method: 'record', note: 'fund-fee' })
    await FeeReceipt.create({ scope: 'personal', investorId: investors[0].id, amount: 4444, occurredOn: '2026-04-01', method: 'record', note: 'personal-fee' })
    const { c } = await setup('admin')

    const fundDiv = (await c.get('/dividends')).html
    assert.include(fundDiv, 'fund-div')
    assert.notInclude(fundDiv, 'personal-div')
    const perDiv = (await c.get('/personal/dividends')).html
    assert.include(perDiv, 'personal-div')
    assert.notInclude(perDiv, 'fund-div')

    const fundFee = (await c.get('/fees')).html
    assert.include(fundFee, 'fund-fee')
    assert.notInclude(fundFee, 'personal-fee')
    assert.include(fundFee, 'name="scope" value="fund"')
    assert.notInclude(fundFee, 'value="personal"', 'the fund fee page has no personal-account form')
    const perFee = (await c.get('/personal/fees')).html
    assert.include(perFee, 'personal-fee')
    assert.notInclude(perFee, 'fund-fee')

    // creating a personal dividend / fee returns to the personal page, a fund one to the fund page
    const d1 = await c.post('/dividends', { scope: 'personal', investorId: String(investors[0].id), amount: '500', occurredOn: '1405/01/20' }, '/personal/dividends')
    assert.equal(d1.location, '/personal/dividends')
    const d2 = await c.post('/dividends', { scope: 'fund', amount: '600', occurredOn: '1405/01/20' }, '/dividends')
    assert.equal(d2.location, '/dividends')
    const f1 = await c.post('/fees', { scope: 'personal', investorId: String(investors[0].id), amount: '700', occurredOn: '1405/01/20' }, '/personal/fees')
    assert.equal(f1.location, '/personal/fees')
    const f2 = await c.post('/fees', { scope: 'fund', method: 'record', amount: '800', occurredOn: '1405/01/20' }, '/fees')
    assert.equal(f2.location, '/fees')

    // editing never moves a record between the fund and a personal account
    const row = await Dividend.query().where('note', 'fund-div').firstOrFail()
    await c.post(`/dividends/${row.id}`, { scope: 'personal', investorId: String(investors[0].id), amount: '12345', occurredOn: '1405/01/12' }, '/dividends')
    const after = await Dividend.findOrFail(row.id)
    assert.equal(after.scope, 'fund')
    assert.isNull(after.investorId)
    assert.equal(Number(after.amount), 12345)
  })

  test('the menu has separate fund and personal groups', async ({ assert }) => {
    await seedFund(1_000_000, [['A', 1000]])
    const { c } = await setup('admin')
    // three main tabs everywhere; the sub-tabs shown are the ones of the current main tab only
    const personal = (await c.get('/personal')).html
    for (const href of ['/', '/personal', '/reconciliation', '/personal/dividends', '/personal/fees']) assert.include(personal, `href="${href}"`)
    for (const href of ['/dividends', '/fees', '/transactions', '/settings']) assert.notInclude(personal, `href="${href}"`)
    const fund = (await c.get('/dividends')).html
    for (const href of ['/dividends', '/fees', '/transactions', '/investors']) assert.include(fund, `href="${href}"`)
    for (const href of ['/personal/dividends', '/personal/fees', '/settings']) assert.notInclude(fund, `href="${href}"`)
    const system = (await c.get('/settings')).html
    for (const href of ['/reconciliation', '/formulas', '/settings', '/backup', '/audit']) assert.include(system, `href="${href}"`)
    assert.notInclude(system, 'href="/transactions"')
    assert.include((await c.get('/investors/' + (await db.from('investors').first()).id + '/personal')).html, 'href="/personal/fees"')
    assert.equal((await c.get('/personal/dividends')).status, 200)
    assert.equal((await c.get('/personal/fees')).status, 200)
  })
})
