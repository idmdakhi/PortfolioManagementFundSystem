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
  months: vine.number().min(1).max(12),
  beginMarket: vine.number(),
  openingDeposits: vine.number(),
  openingWithdrawals: vine.number(),
  fixedRate: vine.number(),
  mgmtRate: vine.number(),
  excessRate: vine.number(),
  feeCap: vine.number(),
  discount: vine.number(),
  mgmtRate2: vine.number(),
  excessRate2: vine.number(),
})

export const valuationValidator = vine.create({
  marketValue: vine.number().min(0),
  valuationOn: vine.string().trim().optional(),
})

export const personalValidator = vine.create({
  periodId: vine.number(),
  beginValue: vine.number(),
  deposits: vine.number(),
  withdrawals: vine.number(),
  marketValue: vine.number(),
})
