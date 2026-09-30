/**
 * GroupAllocator — تقسیم تراکنش گروهی
 *
 * فقط تجدید سرمایه‌گذاری:
 * - درآمد/واریز → مبلغ مثبت
 * - هزینه/برداشت → مبلغ منفی
 * - تعدیل → علامت همان مبلغ ورودی
 *
 * خروجی: لیست { personId, signedAmount }
 * فراخواننده تصمیم می‌گیرد مبلغ را به بهای صندوق یا بهای شخصی اضافه کند
 * (بر اساس accountType فرد).
 */

import type { AllocationMethod, GroupTxType, SpecificShare } from '../Models/group_transaction.ts'

export interface ActiveMember {
  personId: number
}

export interface AllocationLine {
  personId: number
  signedAmount: number
}

function signForType(type: GroupTxType, amount: number): number {
  if (type === 'adjustment') return amount // علامت از قبل در amount است
  if (type === 'income' || type === 'deposit') return Math.abs(amount)
  // expense | withdraw
  return -Math.abs(amount)
}

export class GroupAllocator {
  /**
   * تخصیص مساوی بین اعضای فعال گروه
   */
  static equal(totalAmount: number, type: GroupTxType, members: ActiveMember[]): AllocationLine[] {
    if (members.length === 0) return []
    const signed = signForType(type, totalAmount)
    const share = signed / members.length
    return members.map((m) => ({ personId: m.personId, signedAmount: share }))
  }

  /**
   * تخصیص درصدی — value در shares = درصد (مثلاً 60)
   */
  static byPercent(
    totalAmount: number,
    type: GroupTxType,
    shares: SpecificShare[]
  ): AllocationLine[] {
    const signed = signForType(type, totalAmount)
    return shares.map((s) => ({
      personId: s.personId,
      signedAmount: (signed * s.value) / 100,
    }))
  }

  /**
   * تخصیص مبلغ ثابت — value در shares = مبلغ ریالی (با علامت نوع اعمال می‌شود)
   */
  static byFixedAmount(type: GroupTxType, shares: SpecificShare[]): AllocationLine[] {
    return shares.map((s) => ({
      personId: s.personId,
      signedAmount: signForType(type, s.value),
    }))
  }

  /**
   * نقطه ورود واحد
   */
  static allocate(params: {
    type: GroupTxType
    totalAmount: number
    method: AllocationMethod
    members?: ActiveMember[] // برای equal
    shares?: SpecificShare[] // برای percent / fixed
  }): AllocationLine[] {
    const { type, totalAmount, method, members = [], shares = [] } = params

    switch (method) {
      case 'equal':
        return this.equal(totalAmount, type, members)
      case 'percent':
        return this.byPercent(totalAmount, type, shares)
      case 'fixed_amount':
        return this.byFixedAmount(type, shares)
      default:
        return []
    }
  }
}
