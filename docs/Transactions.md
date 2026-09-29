# Transactions (Current Implementation)

## انواع تراکنش‌های پیاده‌سازی‌شده

### FundTransaction (صندوق)
**Model**: `app/models/fund_transaction.ts`
**Table**: `fund_transactions`

| Type | Description | Person Required | Amount | Units |
|------|-------------|-----------------|--------|-------|
| `buy_units` | خرید واحد (واریز به صندوق) | ✅ Yes | ریال (مثبت) | ✅ محاسبه می‌شود |
| `sell_units` | ابطال واحد (برداشت از صندوق) | ✅ Yes | ریال (مثبت) | ✅ محاسبه می‌شود |
| `mark_to_market` | ثبت ارزش روز کل صندوق | ❌ No (null) | ریال (ارزش کل) | ❌ No |
| `adjustment` | تعدیل / رفع مغایرت | ✅ Yes | ریال (مثبت/منفی) | ❌ Optional |

## Group Transaction
ساختار شامل totalAmount، targetType، targetGroup/persons و allocationMethod است. اثر همیشه
Reinvestment است — فیلد جداگانه‌ای برای effect/cash وجود ندارد (نگاه کنید به BusinessRules.md).

### PersonalTransaction (حساب شخصی)
**Model**: `app/models/personal_transaction.ts`
**Table**: `personal_transactions`

| Type | Description | Person Required | Amount | Asset Type |
|------|-------------|-----------------|--------|------------|
| `deposit` | واریز به حساب شخصی | ✅ Yes | ریال (مثبت) | ✅ Optional |
| `withdraw` | برداشت از حساب شخصی | ✅ Yes | ریال (مثبت) | ✅ Optional |
| `mark_to_market` | ثبت ارزش روز حساب شخصی | ✅ Yes | ریال (ارزش کل) | ✅ Optional |
| `adjustment` | تعدیل حساب شخصی | ✅ Yes | ریال (مثبت/منفی) | ✅ Optional |

**Asset Types** (رشته آزاد، مقادیر پیشنهادی):
- `coin` — سکه
- `usd` — دلار
- `stock` — سهام
- `real_estate` — ملک
- `deposit` — سپرده بانکی
- `other` — سایر

---

### GroupTransaction (گروهی)
**Model**: `app/models/group_transaction.ts`
**Table**: `group_transactions`

| Type | Description | Sign | Target | Allocation |
|------|-------------|------|--------|------------|
| `income` | درآمد (مثل سود سرمایه‌گذاری) | + | group / specific | equal / percent / fixed |
| `expense` | هزینه (مثل کارمزد، خسارت) | - | group / specific | equal / percent / fixed |
| `deposit` | واریز گروهی (مثل فروش دارایی) | + | group / specific | equal / percent / fixed |
| `withdraw` | برداشت گروهی (مثل خرید دارایی) | - | group / specific | equal / percent / fixed |
| `adjustment` | تعدیل گروهی | ± (ورودی) | group / specific | equal / percent / fixed |

**نکته مهم**: در پیاده‌سازی فعلی **همه تراکنش‌های گروهی از نوع Reinvestment هستند** (نقدی حذف شده، به بهای صندوق یا حساب شخصی اضافه می‌شود). این در `GroupTransaction.description` و کامنت‌های کد قید شده.

---

## وضعیت تراکنش (Status)
**پیاده‌سازی نشده** — در مدل‌های فعلی فیلد `status` وجود ندارد.

| Status (Target) | Description |
|-----------------|-------------|
| `Draft` | پیش‌نویس، قابل ویرایش |
| `Pending` | در انتظار تأیید/بررسی |
| `Posted` | تایید شده، اثر مالی ثبت شده، immutable |
| `Reversed` | معکوس شده (با reversal transaction) |
| `Cancelled` | لغو شده (قبل از posting) |

**Action Required**: اضافه کردن فیلد `status` به تمام جداول تراکنش.

---

## چرخه حیات (Lifecycle)

### Fund / Personal Transaction
```
Create (Draft) → Validate → Post → Ledger (Not Implemented) → Commit
     ↓              ↓         ↓
  Store         Business   DB Transaction
  in DB         Rules      (Atomic)
```

### Group Transaction
```
Create → Validate (target, shares, allocation sum) → Allocate (GroupAllocator) →
Post → Apply to Person (FundTransaction or PersonalTransaction) → Commit
```

**Atomicity**: در کنترلرها باید داخل `Database.transaction()` اجرا شود (فعلاً در سرویس‌ها پیاده‌سازی نشده).

---

## Group Transaction Structure

```typescript
{
  txDate: '1403/06/15',
  type: 'income',                    // GroupTxType
  totalAmount: 4_800_000_000,        // ریال
  targetType: 'group',               // 'group' | 'specific_people'
  groupId: 1,                        // اگر group
  specificShares: [                  // اگر specific_people
    { personId: 3, value: 60 },
    { personId: 4, value: 40 }
  ],
  allocationMethod: 'equal',         // 'equal' | 'percent' | 'fixed_amount'
  description: 'سود ماهانه صندوق'
}
```

**Allocation Methods**:
- `equal`: تقسیم مساوی بین اعضای فعال گروه (`GroupAllocator.equal`)
- `percent`: بر اساس درصد (`GroupAllocator.byPercent`) — `value` = درصد
- `fixed_amount`: بر اساس مبلغ ثابت (`GroupAllocator.byFixedAmount`) — `value` = ریال

---

## Validation Rules (Current + Target)

### FundTransaction
- [x] `txDate` معتبر (فرمت تاریخ)
- [x] `amount > 0` (trừ adjustment)
- [x] `personId` موجود و active (trừ mark_to_market)
- [x] `type` در enum مجاز
- [ ] `units` محاسبه شده و ذخیره شده برای buy/sell
- [ ] Idempotency key

### PersonalTransaction
- [x] `txDate` معتبر
- [x] `amount > 0` (trừ adjustment)
- [x] `personId` موجود و active
- [x] `type` در enum مجاز
- [ ] `assetType` برای deposit/withdraw الزامی
- [ ] Idempotency key

### GroupTransaction
- [x] `txDate` معتبر
- [x] `totalAmount > 0` (trừ adjustment)
- [x] `type` در enum مجاز
- [x] `targetType` و `groupId`/`specificShares` سازگار
- [x] `allocationMethod` در enum مجاز
- [x] جمع `specificShares.value` با `totalAmount` سازگار (percent=100، fixed=sum)
- [ ] اعضا در `specificShares` باید active و در گروه باشند
- [ ] Idempotency key

---

## Atomicity Requirements

**Target**: ثبت transaction، allocation و ledger باید در یک **database transaction** انجام شود.

```typescript
// Pattern مورد نیاز در کنترلرها
await Database.transaction(async (trx) => {
  const tx = await GroupTransaction.create(data, { client: trx })
  const lines = GroupAllocator.allocate({ ... })
  // برای هر line: ایجاد FundTransaction یا PersonalTransaction
  await Promise.all(lines.map(...))
})
```

**Status**: فعلاً در سرویس‌ها پیاده‌سازی نشده — کنترلرها باید این الگو را دنبال کنند.

---

## Idempotency

**Not Implemented** — هر دستور مالی باید `idempotencyKey` داشته باشد.

```typescript
// Target implementation
interface Command {
  idempotencyKey: string  // UUID یا hash از محتوای درخواست
  // ... data
}
```

---

## Reversal / Adjustment Pattern

| Scenario | Current | Target |
|----------|---------|--------|
| **Reversal** | ❌ Not implemented | ایجاد تراکنش جدید با `type=adjustment` و مبلغ منفی، ارجاع به تراکنش اصلی |
| **Adjustment** | ✅ `type=adjustment` موجود | همان + ارجاع به تراکنش اصلی + reason |
| **Correction** | ❌ | Reversal + New Transaction |

**Rule**: تراکنش `Posted` حذف فیزیکی نمی‌شود. اصلاح فقط با Reversal/Adjustment.

---

## Gap Analysis (Missing Transaction Types)

| Type | Architecture.md | Current | Needed For |
|------|-----------------|---------|------------|
| `Transfer` | ✅ | ❌ | انتقال بین حساب‌ها/پورتفوی‌ها |
| `Reinvestment` | ✅ | ⚠️ Implicit in GroupTx | تجدید سرمایه‌سازی صریح |
| `Fee` | ✅ | ❌ (FeeEngine only) | تسویه کارمزد به Ledger |
| `Reversal` | ✅ | ❌ | معکوس کردن تراکنش |
| `Adjustment` | ✅ | ✅ (all three) | تعدیل |
