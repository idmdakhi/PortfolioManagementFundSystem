# Domain Model (Current Implementation)

## Aggregateهای پیاده‌سازی‌شده (Actual Models)

### Person
**فایل**: `app/models/person.ts`  
**جدول**: `people`  
**فیلدها**:
- `id`: number (PK)
- `name`: string (UNIQUE)
- `groupId`: number | null (FK → Group)
- `accountType`: `'fund_and_personal' | 'personal_only'`
- `isActive`: boolean
- `excessFeeRate`: number (decimal 8,4) — نرخ سهم مازاد کارمزد
- `feeCap`: number (bigint) — سقف کارمزد سالانه
- `notes`: string | null
- `createdAt`, `updatedAt`: DateTime

**Relations**:
- `group`: BelongsTo Group
- `fundTransactions`: HasMany FundTransaction
- `personalTransactions`: HasMany PersonalTransaction

---

### Group
**فایل**: `app/models/group.ts`  
**جدول**: `groups`  
**فیلدها**:
- `id`: number (PK)
- `name`: string (UNIQUE)
- `isActive`: boolean
- `notes`: string | null
- `createdAt`, `updatedAt`: DateTime

**Relations**:
- `members`: HasMany Person

---

### FundTransaction
**فایل**: `app/models/fund_transaction.ts`  
**جدول**: `fund_transactions`  
**فیلدها**:
- `id`: number (PK)
- `txDate`: string (تاریخ شمسی YYYY/MM/DD یا میلادی)
- `personId`: number | null (FK → Person, NULL برای mark_to_market سطح صندوق)
- `type`: `'buy_units' | 'sell_units' | 'mark_to_market' | 'adjustment'`
- `amount`: number (bigint, ریال) — برای mark_to_market = ارزش روز کل صندوق
- `units`: number | null (decimal 18,4) — تعداد واحد
- `description`: string | null
- `createdAt`: DateTime

**Relations**:
- `person`: BelongsTo Person

---

### PersonalTransaction
**فایل**: `app/models/personal_transaction.ts`  
**جدول**: `personal_transactions`  
**فیلدها**:
- `id`: number (PK)
- `txDate`: string
- `personId`: number (FK → Person, NOT NULL)
- `type`: `'deposit' | 'withdraw' | 'mark_to_market' | 'adjustment'`
- `amount`: number (bigint, ریال) — مبلغ یا ارزش روز
- `assetType`: string | null — نوع دارایی (سکه، دلار، سهام، ملک، سپرده، سایر)
- `description`: string | null
- `createdAt`: DateTime

**Relations**:
- `person`: BelongsTo Person

---

### GroupTransaction
**فایل**: `app/models/group_transaction.ts`  
**جدول**: `group_transactions`  
**فیلدها**:
- `id`: number (PK)
- `txDate`: string
- `type`: `'income' | 'expense' | 'deposit' | 'withdraw' | 'adjustment'`
- `totalAmount`: number (bigint, ریال)
- `targetType`: `'group' | 'specific_people'`
- `groupId`: number | null (FK → Group, برای targetType=group)
- `specificShares`: `SpecificShare[]` (JSON) — `{ personId, value }[]`
- `allocationMethod`: `'equal' | 'percent' | 'fixed_amount'`
- `description`: string | null
- `createdAt`: DateTime

**Relations**:
- `group`: BelongsTo Group

**Type Exports**:
```typescript
export type GroupTxType = 'income' | 'expense' | 'deposit' | 'withdraw' | 'adjustment'
export type GroupTargetType = 'group' | 'specific_people'
export type AllocationMethod = 'equal' | 'percent' | 'fixed_amount'
export interface SpecificShare { personId: number; value: number }
```

---

### AnnualSnapshot
**فایل**: `app/models/annual_snapshot.ts`  
**جدول**: `annual_snapshots`  
**فیلدها**:
- `id`: number (PK)
- `year`: number
- `personId`: number (FK → Person)
- `fundValue`: number (bigint)
- `personalValue`: number (bigint)
- `totalAum`: number (bigint)
- `feeCharged`: number (bigint)
- `notes`: string | null
- `createdAt`: DateTime

---

## Domain Services (Pure Logic — No ORM)

### NavEngine (`app/services/nav_engine.ts`)
**وظیفه**: محاسبه واحد و NAV صندوق

```typescript
interface FundPosition {
  personId: number
  costBasis: number   // بهای تمام‌شده
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
  static lastMarketValue(rows: { amount: number | null }[]): number
  static computeNav(marketValue: number, totalUnits: number, baseUnitPrice: number): number
  static unitsFromAmount(amount: number, baseUnitPrice: number): number
}
```

- `lastMarketValue`: آخرین مقدار غیرصفر/غیرnull از ردیف‌های mark_to_market
- `computeNav`: NAV = marketValue / totalUnits (fallback به baseUnitPrice اگر واحد ۰ باشد)
- `unitsFromAmount`: محاسبه واحد از مبلغ

---

### GroupAllocator (`app/services/group_allocator.ts`)
**وظیفه**: تقسیم تراکنش گروهی بین اعضا

```typescript
interface AllocationLine { personId: number; signedAmount: number }

class GroupAllocator {
  static equal(totalAmount, type, members): AllocationLine[]
  static byPercent(totalAmount, type, shares): AllocationLine[]
  static byFixedAmount(type, shares): AllocationLine[]
  static allocate(params): AllocationLine[] // نقطه ورود واحد
}
```

- **Equal**: تقسیم مساوی بین اعضای فعال
- **Percent**: بر اساس درصد (value = درصد، مثل 60)
- **Fixed Amount**: بر اساس مبلغ ثابت (value = ریال)
- **Sign Logic**: income/deposit = مثبت، expense/withdraw = منفی، adjustment = همان علامت ورودی

---

### FeeEngine (`app/services/fee_engine.ts`)
**وظیفه**: محاسبه کارمزد سبدگردان

```typescript
interface FeeInput {
  costBasis: number
  currentValue: number
  clientFixedRate: number      // مثلاً 0.20
  managerFixedFeeRate: number  // مثلاً 0.01
  excessFeeRate: number        // مثلاً 0.10 یا 0.20 (per person)
  feeCap: number               // سقف ریالی
}

interface FeeResult {
  grossProfit: number
  clientFixedProfit: number
  excessProfit: number
  fixedFee: number
  excessShare: number
  feeBeforeCap: number
  finalFee: number
}

class FeeEngine {
  static calculate(input: FeeInput): FeeResult
}
```

**فرمول**:
```
grossProfit        = currentValue - costBasis
clientFixedProfit  = costBasis * clientFixedRate
excessProfit       = max(0, grossProfit - clientFixedProfit)
fixedFee           = costBasis * managerFixedFeeRate
excessShare        = excessProfit * excessFeeRate
feeBeforeCap       = fixedFee + excessShare
finalFee           = max(0, min(feeBeforeCap, feeCap))
```

---

## Value Objectها (Implicit / In-code)

| Concept | Representation |
|---------|----------------|
| **Money** | `number` (bigint/ریال) — ⚠️ خطر دقت اعشاری |
| **Percentage** | `number` (0.20 = 20%) |
| **Quantity/Units** | `number` (decimal 18,4) |
| **Date** | `string` (txDate) — ⚠️ بدون parsing/validation متمرکز |
| **TransactionReference** | `id` (number) |
| **Domain IDs** | `number` (auto-increment) |

---

## Invariantهای اصلی (Enforced in Services/Validators)

1. **مبلغ معتبر**: `amount > 0` برای deposit/buy، `amount != 0` برای adjustment
2. **حساب و مالک معتبر**: `personId` باید در `people` موجود و `isActive=true` باشد
3. **تخصیص گروهی**: جمع allocationها باید دقیقاً برابر `totalAmount` باشد
4. **GroupTransaction**: `targetType=group` → `groupId` الزامی، `specificShares=[]`؛ `targetType=specific_people` → `groupId=null`، `specificShares` پر
5. **Allocation Validation**: در `percent` جمع درصدها = 100؛ در `fixed_amount` جمع مقادیر = totalAmount
6. **NAV Calculation**: واحدها از تراکنش‌های buy/sell/adjustment استخراج می‌شوند
7. **Fee Calculation**: کارمزد هرگز منفی نمی‌شود، سقف دارد
8. **Idempotency**: در کنترلرها/سرویس‌ها پیاده‌سازی نشده — **نیاز به اضافه کردن idempotency key**

---

## Aggregateهای **نپیاده‌سازی‌شده** (Planned)

| Aggregate | Description |
|-----------|-------------|
| **Portfolio** | سبد دارایی شخص/گروه/صندوق |
| **Asset** | تعریف دارایی (Cash, Stock, FundUnit, Gold, Other) |
| **Holding** | مقدار یک Asset در Portfolio |
| **LedgerEntry** | ورودی دفتر الأستاذ نامتغیر |
| **Valuation** | اسنپ‌شات روزانه ارزش‌گذاری |
| **Fee / FeeRule** | کارمزد و قانون کارمزد با wersjoning |
| **Allocation** | تخصیص به عنوان Entity جداگانه |
| **AuditLog** | رویداد حسابرسی |

---

## نکات مهم برای توسعه

1. **Money Precision**: فعلاً `number` (JS IEEE 754) استفاده شده. برای produzione باید به `decimal.js`، `big.js` یا `bigint` (ریال به صورت integer) مهاجر شود.
2. **Date Handling**: `txDate` به صورت `string` ذخیره می‌شود. نیاز به Value Object `JalaliDate` یا `EffectiveDate` با parsing/validation متمرکز.
3. **Immutability**: تراکنش‌های posted قابلیت حذف/ویرایش ندارند — نیاز به `status` field یا soft delete.
4. **Ledger Gap**: هیچ LedgerEntry وجود ندارد. تمام محاسبه‌ها از تراکنش‌های خام استخراج می‌شوند (performance risk).
5. **Domain Events**: هیچ رویداد دامنه (Domain Event) پیاده‌سازی نشده — برای projectionها و audit ضروری است.