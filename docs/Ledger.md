# Ledger

Ledger مرجع قابل ردیابی اثر مالی است.

## اصول
- append-oriented
- immutable پس از posting
- هر entry به transaction reference دارد.
- reversal اثر ثبت قبلی را خنثی می‌کند.
- balance باید قابل بازسازی از ledger باشد.

## Entry
id، transactionId، accountId، portfolioId، assetId، direction، amount، quantity، effectiveDate، postedAt، reference و metadata.

## کنترل
- ورودی/خروجی با transaction سازگار باشد.
- entry posted update/delete نشود.
- reconciliation دوره‌ای انجام شود.

Balance(t) = opening + مجموع entryهای posted تا تاریخ t
