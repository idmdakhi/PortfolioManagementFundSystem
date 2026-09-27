# Fees (Current: FeeEngine Only — No Persistence)

## وضعیت: ⚠️ **محاسبه در حافظه (In-Memory) — بدون ذخیره‌سازی**

پیاده‌سازی فعلی تنها شامل `FeeEngine` (`app/services/fee_engine.ts`) برای **محاسبه کارمزد** است. قوانین کارمزد (`FeeRule`)، محاسبه دوره‌ای (`FeeCalculation`)، و تسویه (`FeeSettlement`) **نپیاده‌سازی‌شده** و در دیتابیس ذخیره نمی‌شوند.

---

## پیاده‌سازی فعلی (Implemented)

### FeeEngine (`app/services/fee_engine.ts`)

**ورودی**:
```typescript
interface FeeInput {
  costBasis: number          // بهای تمام‌شده (ریال)
  currentValue: number       // ارزش روز / ارزش فعلی (ریال)
  clientFixedRate: number    // مثلاً 0.20 (۲۰٪ سود ثابت مشتری)
  managerFixedFeeRate: number // مثلاً 0.01 (۱٪ کارمزد ثابت سبدگردان)
  excessFeeRate: number      // مثلاً 0.10 یا 0.20 (سهم مازاد — per person)
  feeCap: number             // سقف کارمزد سالانه (ریال)
}
```

**خروجی**:
```typescript
interface FeeResult {
  grossProfit: number        // سود ناخالص = currentValue - costBasis
  clientFixedProfit: number  // سود ثابت مشتری = costBasis * clientFixedRate
  excessProfit: number       // مازاد سود = max(0, grossProfit - clientFixedProfit)
  fixedFee: number           // کارمزد ثابت = costBasis * managerFixedFeeRate
  excessShare: number        // سهم مازاد = excessProfit * excessFeeRate
  feeBeforeCap: number       // کارمزد قبل از سقف = fixedFee + excessShare
  finalFee: number           // کارمزد نهایی = max(0, min(feeBeforeCap, feeCap))
}
```

**فرمول کامل**:
```
grossProfit       = currentValue - costBasis
clientFixedProfit = costBasis × clientFixedRate
excessProfit      = max(0, grossProfit - clientFixedProfit)
fixedFee          = costBasis × managerFixedFeeRate
excessShare       = excessProfit × excessFeeRate
feeBeforeCap      = fixedFee + excessShare
finalFee          = max(0, min(feeBeforeCap, feeCap))
```

**نکات مهم**:
- کارمزد **هرگز منفی نمی‌شود** (floor = 0)
- کارمزد **سقف دارد** (`feeCap` از تنظیمات Person)
- `excessFeeRate` و `feeCap` **پر نفر** هستند (در `Person` model ذخیره شده)

---

## تست‌ها (tests/engines.spec.ts)

```typescript
// سناریو ۱: سود بالا (۵۰٪)
// costBasis: 1B, currentValue: 1.5B, clientFixedRate: 0.2, managerFixedFeeRate: 0.01, excessFeeRate: 0.1, feeCap: 1B
// grossProfit = 500M, clientFixed = 200M, excess = 300M
// fixedFee = 10M, excessShare = 30M, feeBeforeCap = 40M, finalFee = 40M

// سناریو ۲: سود زیر ۲۰٪ (بدون مازاد)
// costBasis: 1B, currentValue: 1.1B, clientFixedRate: 0.2, managerFixedFeeRate: 0.01, excessFeeRate: 0.2, feeCap: 1B
// grossProfit = 100M, clientFixed = 200M, excess = 0
// fixedFee = 10M, excessShare = 0, finalFee = 10M

// سناریو ۳: زیان (کارمزد ثابت باقی می‌ماند)
// costBasis: 1B, currentValue: 800M, clientFixedRate: 0.2, managerFixedFeeRate: 0.01, excessFeeRate: 0.2, feeCap: 1B
// grossProfit = -200M, clientFixed = 200M, excess = 0
// fixedFee = 10M, finalFee = 10M (هرگز منفی نمی‌شود)
```

---

## معماری هدف (Target Fee System)

### مدل داده (Planned Tables)

#### fee_rules
```sql
CREATE TABLE fee_rules (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  type                VARCHAR(20) NOT NULL,           -- 'management' | 'performance'
  rate                DECIMAL(10,6) NOT NULL,         -- نرخ (مثلاً 0.01)
  base                VARCHAR(20) NOT NULL,           -- 'cost_basis' | 'nav' | 'aum'
  period              VARCHAR(20) NOT NULL,           -- 'daily' | 'monthly' | 'quarterly' | 'annual'
  min_amount          DECIMAL(20,4),                  -- حداقل کارمزد
  max_amount          DECIMAL(20,4),                  -- حداکثر کارمزد (سقف)
  conditions          JSONB,                          -- شرایط اعمال (مثلاً minAum, personType)
  effective_from      DATE NOT NULL,
  effective_to        DATE,                           -- NULL = تا ابد
  version             INTEGER NOT NULL DEFAULT 1,     -- برای versioning
  created_at          TIMESTAMP NOT NULL,
  updated_at          TIMESTAMP NOT NULL
);
```

#### fee_calculations (محاسبه دوره‌ای)
```sql
CREATE TABLE fee_calculations (
  id                  SERIAL PRIMARY KEY,
  fee_rule_id         INTEGER NOT NULL REFERENCES fee_rules(id),
  person_id           INTEGER NOT NULL REFERENCES people(id),
  calculation_date    DATE NOT NULL,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  cost_basis          DECIMAL(20,4) NOT NULL,
  current_value       DECIMAL(20,4) NOT NULL,
  gross_profit        DECIMAL(20,4) NOT NULL,
  client_fixed_profit DECIMAL(20,4) NOT NULL,
  excess_profit       DECIMAL(20,4) NOT NULL,
  fixed_fee           DECIMAL(20,4) NOT NULL,
  excess_share        DECIMAL(20,4) NOT NULL,
  fee_before_cap      DECIMAL(20,4) NOT NULL,
  final_fee           DECIMAL(20,4) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'calculated', -- 'calculated' | 'settled' | 'reversed'
  settled_at          TIMESTAMP,
  reversed_at         TIMESTAMP,
  reversal_reason     TEXT,
  created_at          TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX uq_fee_calc_rule_person_period ON fee_calculations(fee_rule_id, person_id, period_start, period_end);
```

#### fee_settlements (تسویه و اثر مالی)
```sql
CREATE TABLE fee_settlements (
  id                  SERIAL PRIMARY KEY,
  fee_calculation_id  INTEGER NOT NULL REFERENCES fee_calculations(id),
  transaction_id      INTEGER,                          -- ارجاع به FundTransaction (type=fee)
  ledger_entry_id     INTEGER,                          -- ارجاع به LedgerEntry
  amount              DECIMAL(20,4) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'posted' | 'reversed'
  settled_at          TIMESTAMP,
  created_at          TIMESTAMP NOT NULL
);
```

---

## Versioning Strategy

> **تغییر نرخ یا سقف نباید محاسبات گذشته را تغییر دهد.**

- هر `FeeRule` دارای `effective_from`، `effective_to` و `version` است
- محاسبه کارمزد (`FeeCalculation`) **اسنپ‌شات کامل** پارامترهای قانون را ذخیره می‌کند
- تسویه (`FeeSettlement`) ارجاع به `FeeCalculation` دارد
- Reversal از طریق `FeeSettlement` جدید با `status=reversed` و entry معکوس در Ledger

---

## Fee Calculation Flow (Target)

```
Scheduled Job (Daily/Monthly)
       │
       ▼
FeeCalculationService
  1. Find active FeeRules for period
  2. For each Person (active, has fund units):
     a. Get costBasis (from Ledger/Holdings)
     b. Get currentValue (from latest Valuation)
     c. Get person-specific params (excessFeeRate, feeCap)
     d. Call FeeEngine.calculate(input)
     e. Persist FeeCalculation row
       │
       ▼
Approval Workflow (Optional)
       │
       ▼
FeeSettlementService
  1. For approved calculations:
     a. Create FundTransaction (type='fee', amount=finalFee)
     b. Create LedgerEntries (Person: debit fee, Fund: credit fee)
     c. Create FeeSettlement row linking calculation → transaction → ledger
     d. Update FeeCalculation.status = 'settled'
```

---

## Gap Analysis

| Feature | Current | Target | Priority |
|---------|---------|--------|----------|
| `FeeEngine.calculate()` | ✅ Pure function | ✅ Keep | — |
| `FeeRule` model/table | ❌ Missing | ✅ Required | Critical |
| `FeeCalculation` persistence | ❌ Missing | ✅ Required | Critical |
| `FeeSettlement` + Ledger | ❌ Missing | ✅ Required | Critical |
| Person params (excessFeeRate, feeCap) | ✅ In Person model | ✅ Keep | — |
| Scheduled calculation job | ❌ Missing | ✅ Required | High |
| Approval workflow | ❌ Missing | ⚠️ Optional | Medium |
| Multi-rule support | ❌ Single hardcoded | ✅ Required | High |
| Fee accrual (daily) | ❌ Missing | ✅ Required | Medium |
| Historical versioning | ❌ Missing | ✅ Required | High |
| Reporting (fee history, YTD) | ❌ Missing | ✅ Required | Medium |

---

## Integration Points

| Component | Current | Target |
|-----------|---------|--------|
| **Person Model** | `excessFeeRate`, `feeCap` fields | Keep + add `feeRuleId` (FK) |
| **NavEngine/Valuation** | Provides `currentValue` | Provide via `ValuationSnapshot` |
| **Ledger** | ❌ Not implemented | FeeSettlement → LedgerEntries |
| **FundTransaction** | ❌ No 'fee' type | Add `type='fee'` enum value |
| **GroupTransaction** | ❌ Not used for fees | Could allocate fee income to group |

---

## Migration Path

1. **Add `fee` type** to `FundTransaction` enum (migration)
2. **Create `fee_rules` table** + model + seed default rule
3. **Create `fee_calculations` table** + model
4. **Build `FeeCalculationService`** using `FeeEngine` + persist results
5. **Create `fee_settlements` table** + model
6. **Build `FeeSettlementService`** with Ledger integration
6. **Add scheduled job** (AdonisJS Scheduler) برای محاسبه دوره‌ای
7. **Add API/Controller** برای مشاهده، تأیید، و گزارش کارمزد