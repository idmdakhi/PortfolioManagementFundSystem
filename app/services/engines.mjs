/**
 * نسخه قابل اجرای مستقیم Node — بدون وابستگی به Adonis
 * node apps/api/app/Services/engines.mjs
 */

export class FeeEngine {
  static calculate(input) {
    const {
      costBasis,
      currentValue,
      clientFixedRate,
      managerFixedFeeRate,
      excessFeeRate,
      feeCap,
    } = input
    const grossProfit = currentValue - costBasis
    const clientFixedProfit = costBasis * clientFixedRate
    const excessProfit = Math.max(0, grossProfit - clientFixedProfit)
    const fixedFee = costBasis * managerFixedFeeRate
    const excessShare = excessProfit * excessFeeRate
    const feeBeforeCap = fixedFee + excessShare
    const finalFee = Math.max(0, Math.min(feeBeforeCap, feeCap))
    return { grossProfit, clientFixedProfit, excessProfit, fixedFee, excessShare, feeBeforeCap, finalFee }
  }
}

function signForType(type, amount) {
  if (type === 'adjustment') return amount
  if (type === 'income' || type === 'deposit') return Math.abs(amount)
  return -Math.abs(amount)
}

export class GroupAllocator {
  static equal(totalAmount, type, members) {
    if (!members.length) return []
    const signed = signForType(type, totalAmount)
    const share = signed / members.length
    return members.map((m) => ({ personId: m.personId, signedAmount: share }))
  }
  static byPercent(totalAmount, type, shares) {
    const signed = signForType(type, totalAmount)
    return shares.map((s) => ({ personId: s.personId, signedAmount: (signed * s.value) / 100 }))
  }
  static byFixedAmount(type, shares) {
    return shares.map((s) => ({ personId: s.personId, signedAmount: signForType(type, s.value) }))
  }
}

export class NavEngine {
  static lastMarketValue(rows) {
    for (let i = rows.length - 1; i >= 0; i--) {
      const a = rows[i].amount
      if (a != null && a !== 0) return a
    }
    return 0
  }
  static computeNav(marketValue, totalUnits, baseUnitPrice) {
    if (totalUnits <= 0) return baseUnitPrice
    return marketValue / totalUnits
  }
}

// ── self-test ──
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('engines.mjs')) {
  const assert = (c, m) => { if (!c) throw new Error(m) }

  let r = FeeEngine.calculate({
    costBasis: 1e9, currentValue: 1.5e9, clientFixedRate: 0.2,
    managerFixedFeeRate: 0.01, excessFeeRate: 0.1, feeCap: 1e9,
  })
  assert(r.finalFee === 40e6, 'fee high profit')
  console.log('✓ FeeEngine سود بالا →', r.finalFee)

  r = FeeEngine.calculate({
    costBasis: 1e9, currentValue: 1.1e9, clientFixedRate: 0.2,
    managerFixedFeeRate: 0.01, excessFeeRate: 0.2, feeCap: 1e9,
  })
  assert(r.excessShare === 0 && r.finalFee === 10e6, 'fee low profit')
  console.log('✓ FeeEngine زیر ۲۰٪ →', r.finalFee)

  const lines = GroupAllocator.equal(4.8e9, 'deposit', [{ personId: 3 }, { personId: 4 }, { personId: 5 }])
  assert(lines[0].signedAmount === 1.6e9, 'equal')
  console.log('✓ GroupAllocator مساوی →', lines[0].signedAmount)

  const exp = GroupAllocator.equal(120e6, 'expense', [{ personId: 3 }, { personId: 4 }, { personId: 5 }])
  assert(exp[0].signedAmount === -40e6, 'expense neg')
  console.log('✓ GroupAllocator هزینه →', exp[0].signedAmount)

  const last = NavEngine.lastMarketValue([{ amount: 100 }, { amount: null }, { amount: 0 }, { amount: 30753423791 }])
  assert(last === 30753423791, 'nav last')
  console.log('✓ NavEngine آخرین ارزش →', last)

  console.log('\nهمه تست‌ها پاس شدند.')
}
