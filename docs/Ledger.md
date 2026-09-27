# Ledger (Not Yet Implemented)

## وضعیت: ❌ **نپیاده‌سازی‌شده**

در معماری هدف (Architecture.md)، Ledger به عنوان **منبع حقیقت مالی** (Single Source of Truth) تعریف شده است. در پیاده‌سازی فعلی **هیچ جدولی یا مدلی برای Ledger وجود ندارد**.

---

## معماری هدف (Target Design)

### اصول
- **Append-only**: فقط insert، بدون update/delete روی entryهای posted
- **Immutable پس از posting**: ورودی ثبت‌شده تغییر نمی‌کند
- **هر entry ارجاع به تراکنش دارد**: `transactionId` + `transactionType`
- **Reversal اثر قبلی را خنثی می‌کند**: entry جدید با جهت معکوس
- **Balance قابل بازسازی است**: از مجموع entryها محاسبه می‌شود

### LedgerEntry Schema (Target)
```sql
CREATE TABLE ledger_entries (
  id              SERIAL PRIMARY KEY,
  transaction_id  INTEGER NOT NULL,           -- ارجاع به تراکنش اصلی
  transaction_type VARCHAR(20) NOT NULL,      -- 'fund' | 'personal' | 'group' | 'fee' | 'adjustment'
  account_id      INTEGER NOT NULL,           -- شخص/حساب متاثر
  portfolio_id    INTEGER,                    -- پورتفوی (اختیاری)
  asset_id        INTEGER,                    -- دارایی (اختیاری)
  direction       VARCHAR(10) NOT NULL,       -- 'debit' | 'credit'
  amount          DECIMAL(20,4) NOT NULL,     -- مبلغ ریال
  quantity        DECIMAL(18,4),              -- تعداد واحد/سهم
  effective_date  DATE NOT NULL,              -- تاریخ اثر مالی (bitemporal)
  posted_at       TIMESTAMP NOT NULL,         -- زمان ثبت در سیستم
  reference       VARCHAR(100),               -- شناسه مرجع (reversal ref و غیره)
  metadata        JSONB,                      -- داده‌های اضافه
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ledger_account_date ON ledger_entries(account_id, effective_date);
CREATE INDEX idx_ledger_tx ON ledger_entries(transaction_id, transaction_type);
CREATE INDEX idx_ledger_portfolio ON ledger_entries(portfolio_id);
CREATE INDEX idx_ledger_effective ON ledger_entries(effective_date);
```

---

## جریان ثبت در Ledger (Target Flow)

```
Domain Service (e.g., FundTransactionService)
       │
       ▼
Validate & Calculate Effects
       │
       ▼
Database Transaction ┌─────────────────────────┐
       │             │ 1. Create Transaction   │
       ▼             │ 2. Create LedgerEntries │
  Commit/Rollback    │ 3. Update Projections   │
                     └─────────────────────────┘
```

### مثال: خرید واحد صندوق (buy_units)
| Entry | Account | Direction | Amount | Quantity | Asset |
|-------|---------|-----------|--------|----------|-------|
| 1 | Person (Cash) | Credit | -50,000,000 | - | Cash |
| 2 | Person (Fund Units) | Debit | +50,000,000 | +5,000 | FundUnit |
| 3 | Fund (Cash) | Debit | +50,000,000 | - | Cash |
| 4 | Fund (Units Outstanding) | Credit | -50,000,000 | -5,000 | FundUnit |

---

## Projections (Read Models)

Ledger تنها منبع نوشتن است. مدل‌های خواندن (Projections) به‌صورت asynchronous یا در همان تراکنش به‌روزرسانی می‌شوند:

| Projection | Source | Update Trigger |
|------------|--------|----------------|
| **Account Balance** | LedgerEntries (sum per account/asset) | On commit |
| **Portfolio Holdings** | LedgerEntries (sum per portfolio/asset) | On commit |
| **Fund NAV** | LedgerEntries (fund cash + holdings) | On commit / Scheduled |
| **Person Valuation** | LedgerEntries + AssetPrices | Daily job |
| **Fee Accrual** | FeeEngine → FeeSettlement → Ledger | Periodic |

---

## Reversal Pattern

```typescript
// Target implementation
async function reverseTransaction(originalTxId: number, reason: string) {
  const originalEntries = await LedgerEntry.findByTransaction(originalTxId)
  
  await Database.transaction(async (trx) => {
    // 1. Create reversal transaction record
    const reversalTx = await Transaction.create({
      type: 'reversal',
      reference: originalTxId,
      reason,
      // ...
    }, { client: trx })
    
    // 2. Create reversing ledger entries (opposite direction)
    for (const entry of originalEntries) {
      await LedgerEntry.create({
        transactionId: reversalTx.id,
        transactionType: 'reversal',
        accountId: entry.accountId,
        portfolioId: entry.portfolioId,
        assetId: entry.assetId,
        direction: entry.direction === 'debit' ? 'credit' : 'debit',
        amount: entry.amount,
        quantity: entry.quantity,
        effectiveDate: entry.effectiveDate, // یا تاریخ امروز بسته به policy
        postedAt: DateTime.now(),
        reference: `REV-${originalTxId}`,
        metadata: { originalEntryId: entry.id, reason }
      }, { client: trx })
    }
    
    // 3. Update projections (balances, holdings, etc.)
  })
}
```

---

## Reconciliation (دوری)

```sql
-- بررسی تعادل حساب‌ها
SELECT account_id, asset_id, SUM(CASE direction WHEN 'debit' THEN amount ELSE -amount END) as balance
FROM ledger_entries
WHERE posted_at <= '2024-12-31'
GROUP BY account_id, asset_id
HAVING balance != expected_balance;
```

---

## Gap Analysis (Current → Target)

| Feature | Current | Target | Effort |
|---------|---------|--------|--------|
| `ledger_entries` table | ❌ Missing | ✅ Required | High |
| `LedgerEntry` model | ❌ Missing | ✅ Required | High |
| `LedgerService` | ❌ Missing | ✅ Required | High |
| Atomic posting (tx + ledger) | ❌ Missing | ✅ Required | High |
| Balance reconstruction | ❌ Manual queries | ✅ From ledger | Medium |
| Reversal automation | ❌ Manual | ✅ Service | Medium |
| Reconciliation job | ❌ Missing | ✅ Scheduled | Low |
| Audit trail on ledger | ❌ Missing | ✅ Required | Medium |

---

## Migration Path

1. **Phase 1**: Create `ledger_entries` table + model
2. **Phase 2**: Implement `LedgerService.postTransaction()` برای هر نوع تراکنش
3. **Phase 3**: Refactor existing services (NavEngine, FeeEngine) برای استفاده از Ledger به جای queryهای مستقیم
4. **Phase 4**: Build projections (balance, holdings, NAV) از Ledger
5. **Phase 5**: Add reversal/adjustment automation
6. **Phase 6**: Reconciliation job + monitoring

---

## نکات کلیدی برای پیاده‌سازی

1. **Precision**: از `decimal` یا `bigint` (ریال) استفاده شود — نه `number`/`float`
2. **Bitemporal**: `effective_date` (تاریخ کسب‌وکار) ≠ `posted_at` (زمان سیستم)
3. **Idempotency**: کلید یکتا روی `(transaction_id, transaction_type, sequence)` یا `reference`
4. **Partitioning**: در مقیاس بزرگ، partitioning بر اساس `effective_date` (ماهانه/سالیانه)
5. **Immutability**: Trigger یا constraint برای جلوگیری از UPDATE/DELETE روی posted entries