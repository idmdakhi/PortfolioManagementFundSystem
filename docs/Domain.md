# Domain Model

## Aggregateهای اصلی
- Person
- Group
- GroupMember
- Account
- Portfolio
- Asset
- Holding
- Transaction
- GroupTransaction
- Allocation
- LedgerEntry
- Valuation
- Fee
- FeeRule

## Value Objectها
Money, Percentage, Quantity, Date, DateRange, TransactionReference و شناسه‌های domain.

## Invariantهای اصلی
- مبلغ معتبر و با precision مشخص باشد.
- حساب و مالک معتبر باشند.
- تخصیص گروهی با مبلغ والد برابر باشد.
- Ledger پس از posting تغییر مستقیم نکند.
- عضویت تاریخی بازنویسی نشود.
- موجودی منفی فقط طبق policy مجاز باشد.
