# Excel Migration

## Flow
Excel → Parse → Normalize → Validate → Preview → Import → Reconcile

## Mapping
افراد → people
گروه‌ها → groups/group_members
حساب شخصی → accounts
تراکنش صندوق → transactions
تراکنش گروهی → group_transactions/allocations
دارایی → assets/holdings
ارزش روز → valuations
کارمزد → fees

## Validation
تاریخ، شخص، گروه، مبلغ، duplicate، account type، target/effect و allocation total.

## Reconciliation
مانده صندوق، مانده نقدی، بهای تمام‌شده، ارزش روز و سهم اعضا با workbook مرجع تطبیق داده شود.

## Rollback
Import باید batch-based و قابل rollback باشد.
