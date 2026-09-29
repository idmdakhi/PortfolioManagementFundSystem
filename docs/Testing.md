# Testing Strategy

## Unit
Domain logic شامل allocation، money، fee، valuation، P/L و validation.

## Integration
Database transaction، ledger posting، group transaction، balance و valuation.

## E2E
Person → Account → Deposit → Group Allocation → Asset Transaction → Valuation → Report

## Golden Scenarios
4,800,000,000 بین 3 عضو فعال با Equal Allocation باید سهم 1,600,000,000 برای هر عضو ایجاد کند.

> ⚠️ **قانون قفل‌شده (اصلاح‌شده):** تراکنش گروهی همیشه Reinvestment است؛ «Cash effect» در این سیستم
> اصلاً وجود ندارد. بنابراین **Target=Group + Reinvestment باید موفق شود** (نه validation error).
> این خط جایگزین نسخهٔ قبلی این سند است که اشتباهاً رد این حالت را انتظار داشت — همان باگی که در استفادهٔ
> واقعی از نسخهٔ اکسل هم رخ داد (واریز خانوادگی روی «فامیل من» با انتظار reinvestment).

Target=Specific Persons + Reinvestment:
- unit holder → fund
- personal-only → personal account

## Invariants
allocation sum = total
reversal net effect = zero
ledger balance reproducible
historical valuation stable
idempotency duplicate ایجاد نکند

هر bug مالی باید regression test داشته باشد.
