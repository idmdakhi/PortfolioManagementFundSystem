# Architecture

## هدف
سیستم باید قابل توسعه، تست‌پذیر و قابل ردیابی باشد و منطق مالی از UI و زیرساخت جدا بماند.

## لایه‌ها
Presentation → Application → Domain → Infrastructure → Database/External Services

## ماژول‌ها
People, Groups, Accounts, Assets, Portfolios, Transactions, Ledger, Valuation, Fees, Reports, Audit, Identity & Access

## قواعد
1. Domain به Infrastructure وابسته نباشد.
2. عملیات مالی atomic باشد.
3. تراکنش posted حذف فیزیکی نشود؛ اصلاح با reversal/adjustment انجام شود.
4. مبلغ مالی با decimal/fixed precision محاسبه شود.
5. effectiveDate از createdAt جدا باشد.
6. عملیات حساس audit شود.
7. UI منبع حقیقت مالی نیست؛ Domain/Ledger منبع حقیقت است.

## جریان
Request → Validate → Authorize → Domain Process → Ledger → Projections → Commit
