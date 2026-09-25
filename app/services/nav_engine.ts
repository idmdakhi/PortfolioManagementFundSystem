/**
 * NavEngine — محاسبه واحد و NAV صندوق
 *
 * واحد فعلی نفر = (جمع خرید − جمع ابطال + تعدیل + سهم گروهی تجدید) / baseUnitPrice
 * یا اگر units در تراکنش ذخیره شده: جمع units خرید − جمع units ابطال
 *
 * NAV = آخرین ارزش روز معتبر صندوق ÷ کل واحدهای فعال
 */

export interface FundPosition {
  personId: number
  costBasis: number   // بهای تمام‌شده (ریال)
  units: number
  marketValue: number // units × nav
}

export interface NavSnapshot {
  lastMarketValue: number
  totalUnits: number
  nav: number
  positions: FundPosition[]
}

export class NavEngine {
  /**
   * آخرین ارزش روز غیرخالی را برمی‌گرداند.
   * rows باید به ترتیب تاریخ (قدیم → جدید) یا حداقل با id صعودی باشند.
   */
  static lastMarketValue(
    markToMarketRows: { amount: number | null }[]
  ): number {
    for (let i = markToMarketRows.length - 1; i >= 0; i--) {
      const a = markToMarketRows[i].amount
      if (a != null && a !== 0) return a
    }
    return 0
  }

  static computeNav(marketValue: number, totalUnits: number, baseUnitPrice: number): number {
    if (totalUnits <= 0) return baseUnitPrice
    return marketValue / totalUnits
  }

  static unitsFromAmount(amount: number, baseUnitPrice: number): number {
    if (baseUnitPrice <= 0) return 0
    return amount / baseUnitPrice
  }
}
