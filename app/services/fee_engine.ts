/**
 * FeeEngine — منطق کارمزد سبدگردان
 *
 * سود ناخالص     = ارزش فعلی − بهای تمام‌شده
 * سود ۲۰٪ ثابت   = بهای تمام‌شده × clientFixedRate   ← مال مشتری
 * مازاد          = max(0, سود ناخالص − سود ثابت)
 * کارمزد ثابت    = بهای تمام‌شده × managerFixedFeeRate
 * سهم مازاد      = مازاد × excessFeeRate (per نفر)
 * کارمزد نهایی   = max(0, min(ثابت + سهم مازاد, feeCap))
 */

export interface FeeInput {
  costBasis: number          // بهای تمام‌شده
  currentValue: number       // ارزش روز / ارزش فعلی
  clientFixedRate: number    // مثلاً 0.20
  managerFixedFeeRate: number // مثلاً 0.01
  excessFeeRate: number      // مثلاً 0.10 یا 0.20
  feeCap: number             // سقف ریالی
}

export interface FeeResult {
  grossProfit: number
  clientFixedProfit: number
  excessProfit: number
  fixedFee: number
  excessShare: number
  feeBeforeCap: number
  finalFee: number
}

export class FeeEngine {
  static calculate(input: FeeInput): FeeResult {
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
    // هرگز منفی + سقف
    const finalFee = Math.max(0, Math.min(feeBeforeCap, feeCap))

    return {
      grossProfit,
      clientFixedProfit,
      excessProfit,
      fixedFee,
      excessShare,
      feeBeforeCap,
      finalFee,
    }
  }
}
