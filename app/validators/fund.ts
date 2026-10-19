import vine from '@vinejs/vine'

export const loginValidator = vine.create({ email: vine.string().email(), password: vine.string().minLength(1) })

export const investorValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
  notes: vine.string().trim().optional(),
  openingUnits: vine.number().min(0).optional(),
  openingCost: vine.number().min(0).optional(),
})

export const transactionValidator = vine.create({
  investorId: vine.number(),
  type: vine.enum(['issue', 'redeem']),
  amount: vine.number().positive(),
  nav: vine.number().positive().optional(),
  occurredOn: vine.string().trim().optional(),
  note: vine.string().trim().optional(),
})

export const dividendValidator = vine.create({
  scope: vine.enum(['fund', 'personal']),
  investorId: vine.number().optional(),
  amount: vine.number().positive(),
  occurredOn: vine.string().trim().optional(),
  note: vine.string().trim().optional(),
})

export const settingsValidator = vine.create({
  label: vine.string().trim(),
  startJalali: vine.string().trim(),
  endJalali: vine.string().trim(),
  months: vine.number().withoutDecimals().min(1).max(12),
  beginMarket: vine.number().min(0),
  openingDeposits: vine.number().min(0),
  openingWithdrawals: vine.number().min(0),
  fixedRate: vine.number().min(0).max(1000),
  mgmtRate: vine.number().min(0).max(100),
  excessRate: vine.number().min(0).max(100),
  feeCap: vine.number().min(0),
  discount: vine.number().min(0),
  mgmtRate2: vine.number().min(0).max(100),
  excessRate2: vine.number().min(0).max(100),
})

export const valuationValidator = vine.create({
  marketValue: vine.number().min(0),
  valuationOn: vine.string().trim().optional(),
})

export const personalValidator = vine.create({
  periodId: vine.number(),
  beginValue: vine.number().min(0),
  deposits: vine.number().min(0),
  withdrawals: vine.number().min(0),
  marketValue: vine.number().min(0),
})

export const periodEditValidator = vine.create({
  label: vine.string().trim(),
  startJalali: vine.string().trim(),
  endJalali: vine.string().trim(),
  months: vine.number().withoutDecimals().min(1).max(12),
  beginMarket: vine.number().min(0),
  openingDeposits: vine.number().min(0),
  openingWithdrawals: vine.number().min(0),
  fixedRate: vine.number().min(0).max(1000),
  mgmtRate: vine.number().min(0).max(100),
  excessRate: vine.number().min(0).max(100),
  feeCap: vine.number().min(0),
  discount: vine.number().min(0),
  mgmtRate2: vine.number().min(0).max(100),
  excessRate2: vine.number().min(0).max(100),
  closeValue: vine.number().min(0).optional(),
})
