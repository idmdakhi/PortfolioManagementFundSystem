# Logical Data Model

## موجودیت‌ها
people
groups
group_members
accounts
portfolios
assets
asset_prices
holdings
transactions
transaction_allocations
ledger_entries
valuations
fees
fee_rules
users
roles
permissions
audit_logs

## روابط
Person 1-N Account
Person N-N Group
Group 1-N GroupMember
Account 1-N Transaction
Portfolio 1-N Holding
Asset 1-N AssetPrice
Transaction 1-N LedgerEntry
GroupTransaction 1-N Allocation

## Constraints
- foreign key برای روابط مالکیتی
- unique برای business keyهای یکتا
- index روی effectiveDate، accountId، portfolioId و transactionId
- amount/quantity با decimal مناسب
- posted financial entry حذف یا update نشود

## History
FeeRule و membership و هر داده‌ای که روی محاسبه گذشته اثر دارد باید version/history داشته باشد.
