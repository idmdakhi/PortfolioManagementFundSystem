import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import User from '#models/user'
import Period from '#models/period'
import Investor from '#models/investor'
import PersonalAccount from '#models/personal_account'

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

export default class extends BaseSeeder {
  async run() {
    await User.updateOrCreate(
      { email: env.get('ADMIN_EMAIL', 'admin') },
      { fullName: 'مدیر', password: env.get('ADMIN_PASSWORD', 'admin'), role: 'admin' }
    )
    if (await Period.first()) return
    await Period.create({
      label: '1404',
      endJalali: '1404/12/29',
      months: 12,
      beginCost: 5330610134,
      openingDeposits: 28642247575,
      openingWithdrawals: 11325805905,
      dividends: 1344360,
      marketValueBase: 28950492884,
      valuationTxId: 0,
      fixedRate: 20,
      mgmtRate: 1,
      excessRate: 10,
      feeCap: 100,
      discount: 0,
      mgmtRate2: 1,
      excessRate2: 20,
    })
    for (const [name, units, acc] of SEED) {
      const inv = await Investor.create({
        name,
        openingUnits: units,
        openingCost: units * AVG_COST,
      })
      const [beginCost, deposits, withdrawals, endCost, marketValue] = acc ?? [0, 0, 0, 0, 0]
      await PersonalAccount.create({
        investorId: inv.id,
        beginCost,
        deposits,
        withdrawals,
        endCost,
        marketValue,
      })
    }
  }
}
