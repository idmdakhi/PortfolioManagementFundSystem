# Valuation (Current: NAV Engine Only)

## وضعیت: ⚠️ **محدود به محاسبه NAV صندوق**

پیاده‌سازی فعلی تنها شامل `NavEngine` (`app/services/nav_engine.ts`) برای محاسبه **واحد و NAV صندوق** است. سیستم ارزش‌گذاری کامل (Valuation Snapshots، Asset Pricing، Holdings Valuation، P/L) **نپیاده‌سازی‌شده** است.

---

## پیاده‌سازی فعلی (Implemented)

### NavEngine (`app/services/nav_engine.ts`)

```typescript
interface FundPosition {
  personId: number
  costBasis: number   // بهای تمام‌شده (ریال)
  units: number
  marketValue: number // units × nav
}

interface NavSnapshot {
  lastMarketValue: number
  totalUnits: number
  nav: number
  positions: FundPosition[]
}

class NavEngine {
  static lastMarketValue(markToMarketRows: { amount: number | null }[]): number
  static computeNav(marketValue: number, totalUnits: number, baseUnitPrice: number): number
  static unitsFromAmount(amount: number, baseUnitPrice: number): number
}
```

**الگوریتم**:
1. **واحد فعلی نفر** = (جمع `buy_units` − جمع `sell_units` + `adjustment` + سهم گروهی تجدید) / `baseUnitPrice`
   - یا اگر `units` در تراکنش ذخیره شده: جمع `units` خرید − جمع `units` ابطال
2. **NAV** = آخرین ارزش روز معتبر صندوق (`mark_to_market` amount) ÷ کل واحدهای فعال
3. **Base Unit Price**: قیمت پایه واحد (پیش‌فرض ۱۰،۰۰۰ ریال) — در `FeeEngine` و `NavEngine` hardcoded است

**ورودی‌ها**:
- `FundTransaction`های نوع `buy_units`، `sell_units`، `adjustment`، `mark_to_market`
- `GroupTransaction`های نوع `income`/`deposit` (تجدید سرمایه‌گذاری → افزایش واحد)

**خروجی**: `NavSnapshot` شامل NAV، کل واحدها، ارزش بازار، و موقعیت هر نفر

---

## معماری هدف (Target Valuation System)

### اجزای کامل
| Component | Description | Status |
|-----------|-------------|--------|
| **Asset Price** | قیمت روز دارایی‌ها (external/source) | ❌ Missing |
| **Quantity** | تعداد از Holdings/Ledger | ❌ Missing |
| **Cash** | موجودی نقدی از Ledger | ❌ Missing |
| **Liabilities** | بدهی‌ها (کارمزد مستحق، وام، ...) | ❌ Missing |
| **Fee Accrual** | کارمزد محاسبه‌شده در انتظار تسویه | ⚠️ FeeEngine only |

### NAV Calculation (Target)
```
NAV = Total Assets - Total Liabilities

Total Assets = Σ (Holding Quantity × Asset Price) + Cash
Total Liabilities = Accrued Fees + Payables + Other
```

### در صندوق واحدی:
```
NAV per Unit = Net Asset Value / Outstanding Units
```

---

## Daily Valuation Snapshot (Target)

**Table**: `valuations` (Not Implemented)

```sql
CREATE TABLE valuations (
  id                  SERIAL PRIMARY KEY,
  valuation_date      DATE NOT NULL,
  portfolio_id        INTEGER,              -- NULL = fund level
  total_assets        DECIMAL(20,4) NOT NULL,
  total_liabilities   DECIMAL(20,4) NOT NULL,
  net_asset_value     DECIMAL(20,4) NOT NULL,
  nav_per_unit        DECIMAL(20,4),        -- for fund
  price_snapshot      JSONB NOT NULL,       -- {assetId: price, ...}
  holdings_snapshot   JSONB NOT NULL,       -- {assetId: qty, costBasis, ...}
  cash                DECIMAL(20,4) NOT NULL,
  liabilities         JSONB,                -- {fees: X, payables: Y, ...}
  created_at          TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX uq_valuation_date_portfolio ON valuations(valuation_date, portfolio_id);
```

### Integrity تاریخی (Historical Integrity)
> **valuation تاریخی نباید با تغییر قیمت امروز تغییر کند.**
> داده‌های مؤثر بر گذشته (AssetPrice، FeeRule، Holding) باید **versioned** باشند.

```sql
-- AssetPrice versioning
CREATE TABLE asset_prices (
  id            SERIAL PRIMARY KEY,
  asset_id      INTEGER NOT NULL REFERENCES assets(id),
  price         DECIMAL(20,4) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'IRR',
  effective_date DATE NOT NULL,
  source        VARCHAR(50),                -- 'manual', 'api:tse', 'api:cbi', ...
  precision     INTEGER NOT NULL DEFAULT 4,
  created_at    TIMESTAMP NOT NULL
);

-- FeeRule versioning
CREATE TABLE fee_rules (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  type              VARCHAR(20) NOT NULL,   -- 'management', 'performance'
  rate              DECIMAL(10,6) NOT NULL,
  base              VARCHAR(20) NOT NULL,   -- 'cost_basis', 'nav'
  period            VARCHAR(20) NOT NULL,
  min_amount        DECIMAL(20,4),
  max_amount        DECIMAL(20,4),
  conditions        JSONB,
  effective_from    DATE NOT NULL,
  effective_to      DATE,                   -- NULL = indefinite
  version           INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMP NOT NULL,
  updated_at        TIMESTAMP NOT NULL
);
```

---

## Profit/Loss Calculation (Target)

سود و زیان باید در نظر بگیرد:
1. **جریان‌های سرمایه** (Deposit/Withdrawal/Buy/Sell)
2. **بروزرسانی ارزش** (Mark to Market / Asset Price Change)
3. **کارمزدها** (Fee Settlement)
4. **درآمد/هزینه گروهی** (Group Transaction Allocation)

**فرمول کلی**:
```
P/L (Period) = Ending NAV - Beginning NAV 
             - Net Capital Flows (Deposits - Withdrawals)
             + Fees Charged
             ± Group Allocations
```

---

## Gap Analysis

| Feature | Current | Target | Priority |
|---------|---------|--------|----------|
| `NavEngine` (Fund NAV) | ✅ Implemented | ✅ Required | — |
| `Asset` / `AssetPrice` models | ❌ Missing | ✅ Required | Critical |
| `Holding` / `Portfolio` models | ❌ Missing | ✅ Required | Critical |
| Daily Valuation Snapshot | ❌ Missing | ✅ Required | High |
| Historical Price Versioning | ❌ Missing | ✅ Required | High |
| FeeRule Versioning | ❌ Missing | ✅ Required | High |
| P/L Calculation Service | ❌ Missing | ✅ Required | High |
| Multi-currency Support | ❌ Missing | ✅ Nice to have | Low |
| Benchmark Comparison | ❌ Missing | ✅ Nice to have | Low |

---

## تست‌های موجود (tests/engines.spec.ts)

```typescript
// NavEngine Tests
NavEngine.lastMarketValue([
  { amount: 9_931_421_653 },
  { amount: 18_350_302_186 },
  { amount: null },
  { amount: 0 },
  { amount: 30_753_423_791 },
]) // → 30_753_423_791 (skip empty/zero rows)

NavEngine.computeNav(30_753_423_791, 785_492, 10_000) // → ~39,152
```

---

## Migration Path

1. **Create Asset/AssetPrice models** + migrations
2. **Create Portfolio/Holding models** + migrations
3. **Build ValuationService** که از Ledger (یا تراکنش‌های خام) Holdings می‌سازد
4. **Daily Valuation Job** که اسنپ‌شات می‌گیرد در `valuations` table
5. **Versioning** برای AssetPrice و FeeRule
6. **P/L Service** برای گزارش‌دهی دوره‌ای
7. **Integration** با FeeEngine برای احتساب کارمزد در Liabilities