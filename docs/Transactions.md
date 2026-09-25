# Transactions

## انواع
Deposit, Withdrawal, Buy, Sell, Transfer, Reinvestment, Fee, Adjustment, Reversal

## وضعیت
Draft, Pending, Posted, Reversed, Cancelled

## چرخه
Draft → Validate → Post → Ledger
Posted → Reverse → Correct Transaction

## Group Transaction
ساختار شامل totalAmount، targetType، targetGroup/persons، allocationMethod، effectType و allocations است.

## Validation
- تاریخ معتبر
- مبلغ معتبر
- حساب معتبر
- وضعیت مالک
- permission
- سازگاری target و effect
- تطبیق total و allocations
- idempotency

## Atomicity
ثبت transaction، allocation و ledger باید در یک database transaction انجام شود.

## Idempotency
command مالی باید idempotency key داشته باشد تا retry باعث ثبت دوباره نشود.
