/**
 * تست ساده بدون فریم‌ورک — با tsx یا node --experimental-strip-types اجرا شود
 * یا منطق را به JS کپی و با node تست کنید.
 */

import { FeeEngine } from '../../app/services/fee_engine.ts'
import { GroupAllocator } from '../../app/services/group_allocator.ts'
import { NavEngine } from '../../app/services/nav_engine.ts'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

// ── FeeEngine ──
{
  const r = FeeEngine.calculate({
    costBasis: 1_000_000_000,
    currentValue: 1_500_000_000,
    clientFixedRate: 0.2,
    managerFixedFeeRate: 0.01,
    excessFeeRate: 0.1,
    feeCap: 1_000_000_000,
  })
  // سود ناخالص 500M، ثابت مشتری 200M، مازاد 300M، سهم مازاد 30M، ثابت 10M → 40M
  assert(r.grossProfit === 500_000_000, 'gross')
  assert(r.clientFixedProfit === 200_000_000, 'client fixed')
  assert(r.excessProfit === 300_000_000, 'excess')
  assert(r.fixedFee === 10_000_000, 'fixed fee')
  assert(r.excessShare === 30_000_000, 'excess share')
  assert(r.finalFee === 40_000_000, 'final fee')
  console.log('✓ FeeEngine — سود بالا')
}

{
  // سود کم → مازاد صفر، کارمزد فقط ۱٪، هرگز منفی
  const r = FeeEngine.calculate({
    costBasis: 1_000_000_000,
    currentValue: 1_100_000_000,
    clientFixedRate: 0.2,
    managerFixedFeeRate: 0.01,
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  })
  assert(r.excessProfit === 0, 'no excess')
  assert(r.excessShare === 0, 'no excess share')
  assert(r.finalFee === 10_000_000, 'only fixed fee')
  console.log('✓ FeeEngine — سود زیر ۲۰٪')
}

{
  // زیان → کارمزد صفر نمی‌شود چون ۱٪ روی بهای تمام‌شده است؛ ولی منفی نمی‌شود
  const r = FeeEngine.calculate({
    costBasis: 1_000_000_000,
    currentValue: 800_000_000,
    clientFixedRate: 0.2,
    managerFixedFeeRate: 0.01,
    excessFeeRate: 0.2,
    feeCap: 1_000_000_000,
  })
  assert(r.finalFee === 10_000_000, 'fixed fee even on loss')
  assert(r.finalFee >= 0, 'never negative')
  console.log('✓ FeeEngine — زیان، حداقل صفر')
}

// ── GroupAllocator ──
{
  const lines = GroupAllocator.equal(4_800_000_000, 'deposit', [
    { personId: 3 },
    { personId: 4 },
    { personId: 5 },
  ])
  assert(lines.length === 3, '3 members')
  assert(lines[0].signedAmount === 1_600_000_000, 'equal share')
  console.log('✓ GroupAllocator — واریز مساوی')
}

{
  const lines = GroupAllocator.equal(120_000_000, 'expense', [
    { personId: 3 },
    { personId: 4 },
    { personId: 5 },
  ])
  assert(lines[0].signedAmount === -40_000_000, 'expense negative')
  console.log('✓ GroupAllocator — هزینه مساوی (منفی)')
}

{
  const lines = GroupAllocator.byPercent(200_000_000, 'income', [
    { personId: 8, value: 60 },
    { personId: 9, value: 40 },
  ])
  assert(lines[0].signedAmount === 120_000_000, '60%')
  assert(lines[1].signedAmount === 80_000_000, '40%')
  console.log('✓ GroupAllocator — درآمد درصدی')
}

// ── NavEngine ──
{
  const last = NavEngine.lastMarketValue([
    { amount: 9_931_421_653 },
    { amount: 18_350_302_186 },
    { amount: null },
    { amount: 0 },
    { amount: 30_753_423_791 },
  ])
  assert(last === 30_753_423_791, 'skip empty rows')
  console.log('✓ NavEngine — آخرین ارزش روز (ردیف خالی نادیده)')
}

{
  const nav = NavEngine.computeNav(30_753_423_791, 785_492, 10_000)
  assert(nav > 30_000 && nav < 50_000, 'nav range')
  console.log('✓ NavEngine — محاسبه NAV:', nav.toFixed(2))
}

console.log('\nهمه تست‌های موتور پاس شدند.')
