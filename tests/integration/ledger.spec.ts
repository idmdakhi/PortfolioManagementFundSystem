import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import Transaction from '#models/transaction'
import { loadState, ledgerOk, type LedgerTx } from '#services/fund_state'
import { reconcile } from '#services/reconcile'
import { audit } from '#services/audit'
import AuditLog from '#models/audit_log'
import { withWriteLock } from '#services/write_lock'
import { canEdit } from '#services/period_guard'
import { resetData, seedFund, issue } from './helpers.js'

const TODAY = '2026-04-10'

test.group('state from the database', (group) => {
  group.each.setup(resetData)

  test('NAV and units come from the ledger (1 investor, 1000 units, value 1,000,000)', async ({ assert }) => {
    await seedFund(1_000_000, [['A', 1000]])
    const st = await loadState()
    assert.lengthOf(st.reports, 1)
    assert.equal(st.reports[0].totalUnits, 1000)
    // no profit -> no fee -> NAV = 1,000,000 / 1000
    assert.approximately(st.reports[0].summary.nav, 1000, 1e-9)
  })

  test('an issue after the valuation adds cash to the market value and units to the investor', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    await issue(investors[0].id, 500_000, 1000)
    const st = await loadState()
    assert.equal(st.reports[0].params.marketValue, 1_500_000)
    assert.approximately(st.reports[0].totalUnits, 1500, 1e-9)
    assert.approximately(st.reports[0].summary.nav, 1000, 1e-9)
  })

  test('foreign keys are enforced: a transaction for a missing investor is rejected', async ({ assert }) => {
    await seedFund(1_000_000, [['A', 1000]])
    await assert.rejects(() => issue(99999, 1000, 1000))
  })

  test('dates must fall inside a period: outside is not editable', async ({ assert }) => {
    await seedFund(1_000_000, [['A', 1000]])
    const st = await loadState()
    assert.isTrue(canEdit(st, '2026-06-01'))
    assert.isFalse(canEdit(st, '2030-01-01'))
  })
})

test.group('ledger rules', (group) => {
  group.each.setup(resetData)

  test('a redeem larger than the holding is refused, also when it breaks a later date', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    const st = await loadState()
    const mk = (id: number, type: 'issue' | 'redeem', units: number, on: string): LedgerTx => ({
      id, investorId: investors[0].id, type, amount: units * 1000, nav: 1000, units, occurredOn: on, note: null, batchId: null, kind: 'normal',
    })
    assert.isTrue(ledgerOk(st, [mk(1e9, 'redeem', 1000, '2026-05-01')]))
    assert.isFalse(ledgerOk(st, [mk(1e9, 'redeem', 1001, '2026-05-01')]))
    // issue on 05-01 funds a redeem on 06-01; removing the issue later would break it
    assert.isTrue(ledgerOk(st, [mk(1e9, 'issue', 500, '2026-05-01'), mk(1e9 + 1, 'redeem', 1500, '2026-06-01')]))
    assert.isFalse(ledgerOk(st, [mk(1e9 + 1, 'redeem', 1500, '2026-06-01')]))
  })

  test('without the write lock two valid redeems together break the ledger; with it only one gets in', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    const id = investors[0].id
    // the same "load -> validate -> write" shape the controllers use
    const tryRedeem = async (units: number, id2: number) => {
      const st = await loadState()
      const cand: LedgerTx = { id: 1e9, investorId: id2, type: 'redeem', amount: units * 1000, nav: 1000, units, occurredOn: '2026-05-01', note: null, batchId: null, kind: 'normal' }
      if (!ledgerOk(st, [...st.txs, cand])) return false
      await Transaction.create({ investorId: id2, type: 'redeem', amount: cand.amount, nav: 1000, units, occurredOn: '2026-05-01' })
      return true
    }

    const racy = await Promise.all([tryRedeem(700, id), tryRedeem(700, id)])
    assert.deepEqual(racy, [true, true], 'documents the race the lock exists for')
    assert.isFalse(ledgerOk(await loadState(), (await loadState()).txs), 'ledger is now broken')

    await db.from('transactions').delete()
    const locked = await Promise.all([withWriteLock(() => tryRedeem(700, id)), withWriteLock(() => tryRedeem(700, id))])
    assert.deepEqual(locked.sort(), [false, true])
    const st = await loadState()
    assert.isTrue(ledgerOk(st, st.txs))
    assert.lengthOf(st.txs, 1)
  })

  test('group insert is atomic: an invalid last item rolls the whole group back', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000], ['B', 1000]])
    await assert.rejects(() =>
      db.transaction(async (trx) => {
        await Transaction.create({ investorId: investors[0].id, type: 'issue', amount: 1000, nav: 1000, units: 1, occurredOn: '2026-04-02', batchId: 'B1' }, { client: trx })
        await Transaction.create({ investorId: investors[1].id, type: 'issue', amount: 1000, nav: 1000, units: 1, occurredOn: '2026-04-02', batchId: 'B1' }, { client: trx })
        await Transaction.create({ investorId: 424242, type: 'issue', amount: 1, nav: 1, units: 1, occurredOn: '2026-04-02', batchId: 'B1' }, { client: trx })
      })
    )
    assert.equal((await loadState()).txs.length, 0)
  })
})

test.group('reconciliation on real database rows', (group) => {
  group.each.setup(resetData)

  test('a healthy fund has no errors', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    await issue(investors[0].id, 100_000, 1000)
    const rec = reconcile(await loadState(), TODAY)
    assert.equal(rec.errors, 0, JSON.stringify(rec.checks.filter((c) => c.level === 'error')))
  })

  test('detects a transaction whose units do not match amount / NAV', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    await Transaction.create({ investorId: investors[0].id, type: 'issue', amount: 100_000, nav: 1000, units: 50, occurredOn: '2026-04-01' })
    const rec = reconcile(await loadState(), TODAY)
    assert.equal(rec.checks.find((c) => c.id === 'tx-units-consistent')!.level, 'error')
    assert.isFalse(rec.ok)
  })

  test('detects negative units and a date outside every period', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 100]])
    await Transaction.create({ investorId: investors[0].id, type: 'redeem', amount: 500_000, nav: 1000, units: 500, occurredOn: '2026-04-01' })
    await issue(investors[0].id, 1000, 1000, '2031-01-01')
    const rec = reconcile(await loadState(), TODAY)
    assert.equal(rec.checks.find((c) => c.id === 'units-non-negative')!.level, 'error')
    assert.equal(rec.checks.find((c) => c.id === 'dates-in-period')!.level, 'error')
  })

  test('detects an orphan fee-unit transaction (no fee receipt)', async ({ assert }) => {
    const { investors } = await seedFund(1_000_000, [['A', 1000]])
    await issue(investors[0].id, 1000, 1000, '2026-04-01', { kind: 'fee' })
    const rec = reconcile(await loadState(), TODAY)
    assert.equal(rec.checks.find((c) => c.id === 'fee-units-linked')!.level, 'error')
  })

  test('warns about a stale valuation but never errors on it', async ({ assert }) => {
    await seedFund(1_000_000, [['A', 1000]])
    const rec = reconcile(await loadState(), '2026-12-01')
    const c = rec.checks.find((x) => x.id === 'valuation-fresh')!
    assert.equal(c.level, 'warning')
    assert.equal(rec.errors, 0)
  })
})

test.group('audit trail', (group) => {
  group.each.setup(resetData)

  const fakeCtx = { auth: { user: { id: 7, email: 'a@b.c' } }, request: { ip: () => '10.0.0.1', method: () => 'POST', url: () => '/transactions/5' } } as never

  test('a change row keeps who, before and after', async ({ assert }) => {
    await audit.change(fakeCtx, { action: 'transaction.update', entity: 'transaction', entityId: 5, before: { amount: 1 }, after: { amount: 2 } })
    const row = await AuditLog.query().firstOrFail()
    assert.equal(row.kind, 'change')
    assert.equal(row.userId, 7)
    assert.equal(row.userEmail, 'a@b.c')
    assert.equal(row.ip, '10.0.0.1')
    assert.deepEqual(JSON.parse(row.before!), { amount: 1 })
    assert.deepEqual(JSON.parse(row.after!), { amount: 2 })
    assert.equal(row.entityId, '5')
  })

  test('passwords and tokens never reach the log', async ({ assert }) => {
    const ctx = { ...(fakeCtx as object), route: { pattern: '/login' }, request: { ip: () => '1.1.1.1', method: () => 'POST', url: () => '/login', all: () => ({ email: 'x@y.z', password: 'secret', _csrf: 'tok', apiToken: 't' }) } } as never
    await audit.request(ctx, 'ok')
    const row = await AuditLog.query().firstOrFail()
    const detail = JSON.parse(row.detail!)
    assert.equal(detail.password, '***')
    assert.equal(detail.apiToken, '***')
    assert.notProperty(detail, '_csrf')
    assert.notInclude(row.detail!, 'secret')
  })
})

test.group('unit split (NAV to 1000)', (group) => {
  group.each.setup(resetData)

  test('splitFactor: NAV / target; null when nothing to do or NAV invalid', async ({ assert }) => {
    const { splitFactor } = await import('#services/unit_split')
    assert.approximately(splitFactor(22292.1887, 1000)!, 22.2921887, 1e-9)
    assert.isNull(splitFactor(1000, 1000))
    assert.isNull(splitFactor(0, 1000))
    assert.isNull(splitFactor(Number.NaN, 1000))
    assert.approximately(splitFactor(500, 1000)!, 0.5, 1e-12) // reverse split
  })

  test('splitting brings NAV to 1000 and changes nobody\'s value, cost, fee or reconciliation', async ({ assert }) => {
    const { applyUnitSplit, splitFactor } = await import('#services/unit_split')
    const { investors } = await seedFund(22_292_000, [['A', 700], ['B', 300]])
    await issue(investors[0].id, 5_000_000, 22292, '2026-04-01')
    const before = await loadState()
    const nav0 = before.current.summary.nav
    assert.isAbove(nav0, 20000)
    const valueOf = (st: typeof before) => st.current.rows.map((r) => [r.name, r.fund.value, r.cost, r.share])
    const f = splitFactor(nav0, 1000)!
    const counts = await applyUnitSplit(f)
    assert.equal(counts.investors, 2)
    assert.equal(counts.transactions, 1)
    const after = await loadState()
    assert.approximately(after.current.summary.nav, 1000, 1e-6)
    assert.approximately(after.current.totalUnits, before.current.totalUnits * f, 1e-6)
    const [b, a] = [valueOf(before), valueOf(after)]
    for (let i = 0; i < b.length; i++) {
      assert.equal(a[i][0], b[i][0])
      assert.approximately(a[i][1] as number, b[i][1] as number, 1, 'value unchanged')
      assert.approximately(a[i][2] as number, b[i][2] as number, 1e-6, 'cost unchanged')
      assert.approximately(a[i][3] as number, b[i][3] as number, 1e-9, 'share unchanged')
    }
    assert.approximately(after.current.summary.fee, before.current.summary.fee, 0)
    const rec = reconcile(after, TODAY)
    assert.equal(rec.errors, 0, JSON.stringify(rec.checks.filter((c) => c.level === 'error')))
    // A second split to the same target has nothing to do.
    assert.isNull(splitFactor(after.current.summary.nav, 1000))
  })
})

test.group('period continuity check uses the fee actually settled', (group) => {
  group.each.setup(resetData)

  test('closed period: next opening = closing - settle receipt; no settle receipt means carried unchanged', async ({ assert }) => {
    const Period = (await import('#models/period')).default
    const FeeReceipt = (await import('#models/fee_receipt')).default
    const rates = { fixedRate: 20, mgmtRate: 1, excessRate: 10, feeCap: 100, discount: 0, mgmtRate2: 1, excessRate2: 20 }
    const mk = (label: string, s: string, e: string, status: string, begin: number, close: number) =>
      Period.create({ label, startOn: s, endOn: e, status, months: 12, beginMarket: begin, openingDeposits: 0, openingWithdrawals: 0, marketValueBase: close, valuationOn: e, ...rates })
    await mk('A', '2025-03-21', '2026-03-20', 'closed', 1_000_000_000, 1_200_000_000)
    await mk('B', '2026-03-21', '2027-03-20', 'open', 1_200_000_000, 1_200_000_000)
    let rec = reconcile(await loadState(), TODAY)
    assert.equal(rec.checks.find((c) => c.id === 'period-continuity')!.level, 'ok')
    await FeeReceipt.create({ scope: 'fund', investorId: null, amount: 50_000_000, occurredOn: '2026-03-20', method: 'settle' })
    rec = reconcile(await loadState(), TODAY)
    const c = rec.checks.find((x) => x.id === 'period-continuity')!
    assert.equal(c.level, 'warning')
    assert.include(c.items[0], '1,150,000,000')
  })
})
