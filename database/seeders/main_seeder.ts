import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import User from '#models/user'
import Period from '#models/period'
import Investor from '#models/investor'
import PersonalAccount from '#models/personal_account'
import Dividend from '#models/dividend'
import HistoryPeriod from '#models/history_period'
import { yearRange } from '#services/jalali'
import { fundSummary, personalAccount, type PeriodParams } from '#services/fund_calculator'

// Opening values come from the workbook; per-investor cost basis is the fund average.
const AVG_COST = 22647051804 / 1289635.2715581702

const SEED: [string, number, number[]?][] = [
  ['خودم', 485557, [2007013240, 10784013211, 4264247775, 8526778676, 10908718992]],
  ['پژمان', 343253.27155817015, [22444814, 858725868, 224671279, 656499403, 885726685]],
  ['عباس', 245000],
  ['مادر', 215825, [625892982, 447680968, 254948259, 818625691, 1181311434]],
  ['زهرا (خاله)', 0, [1366353271, 893352723, 732412560, 1527293434, 2615999369]],
  ['فرزانه (خاله)', 0, [1106855198, 404255663, 238898191, 1267547930, 1834096164]],
  ['محبوبه (عمه)', 0, [5475108699, 913074824, 0, 6388183523, 9953182049]],
  ['امینه (خاله)', 0, [0, 1384226433, 181694124, 1202532309, 1748084635]],
  ['محمود منتجب', 0, [944998786, 1805131, 0, 946803917, 1362669841]],
]

const HISTORY: [string, number, number][] = [
  ['1398', 106.9, 490000000],
  ['1399', 84.77, 1000000000],
  ['1400', 7.2, 0],
  ['1401', 40.95, 0],
  ['1402', 16.38, 0],
  ['1403', 53.94, 222100000],
]

export default class extends BaseSeeder {
  async run() {
    await User.updateOrCreate(
      { email: env.get('ADMIN_EMAIL', 'admin@admin.com') },
      { fullName: 'مدیر', password: env.get('ADMIN_PASSWORD', 'admin'), role: 'admin' }
    )
    if (await Period.first()) return

    const y4 = yearRange(1404)
    const y5 = yearRange(1405)
    const rates = {
      fixedRate: 20,
      mgmtRate: 1,
      excessRate: 10,
      feeCap: 100,
      discount: 0,
      mgmtRate2: 1,
      excessRate2: 20,
    }
    // 1404: closed, from the workbook's financial statement.
    const p4 = await Period.create({
      label: '1404',
      startOn: y4.start,
      endOn: y4.end,
      status: 'closed',
      months: 12,
      beginMarket: 5330610134,
      openingDeposits: 28642247575,
      openingWithdrawals: 11325805905,
      marketValueBase: 28950492884,
      valuationOn: y4.end,
      ...rates,
    })
    // 1405: open, starts from the 1404 closing value after the 1404 fee was settled.
    const units = SEED.reduce((a, x) => a + x[1], 0)
    const base: PeriodParams = {
      months: 12,
      beginMarket: 5330610134,
      deposits: 28642247575,
      withdrawals: 11325805905,
      dividends: 1344360,
      marketValue: 28950492884,
      ...rates,
    }
    const fee4 = fundSummary(base, units).fee
    const carryFund = 28950492884 - fee4
    const p5 = await Period.create({
      label: '1405',
      startOn: y5.start,
      endOn: y5.end,
      status: 'open',
      months: 12,
      beginMarket: carryFund,
      openingDeposits: 0,
      openingWithdrawals: 0,
      marketValueBase: carryFund,
      valuationOn: y4.end,
      ...rates,
    })
    await Dividend.create({
      scope: 'fund',
      investorId: null,
      amount: 1344360,
      occurredOn: y4.end,
      note: 'سود نقدی سهام ۱۴۰۴',
    })

    for (const [name, units, acc] of SEED) {
      const inv = await Investor.create({
        name,
        openingUnits: units,
        openingCost: units * AVG_COST,
      })
      const [beginValue, deposits, withdrawals, , marketValue] = acc ?? [0, 0, 0, 0, 0]
      await PersonalAccount.create({
        investorId: inv.id,
        periodId: p4.id,
        beginValue,
        deposits,
        withdrawals,
        marketValue,
      })
      const fee = Math.round(
        personalAccount(
          { beginValue, deposits, withdrawals, marketValue, dividends: 0 },
          { ...rates, months: 12 }
        ).fee
      )
      await PersonalAccount.create({
        investorId: inv.id,
        periodId: p5.id,
        beginValue: marketValue - fee,
        deposits: 0,
        withdrawals: 0,
        marketValue: marketValue - fee,
      })
    }
    for (const [label, returnPct, fee] of HISTORY)
      await HistoryPeriod.create({ label, returnPct, fee })
  }
}
