# Project Checklist

## Phase 0 — Foundation
- [ ] Scope
- [ ] Domain glossary
- [ ] Money/precision policy
- [ ] Calendar/date policy
- [ ] Currency policy
- [ ] Business rules

## Phase 1 — Architecture
- [ ] Module boundaries
- [ ] Layer boundaries
- [ ] Error strategy
- [ ] Transaction strategy
- [ ] Audit strategy
- [ ] Configuration

## Phase 2 — Domain
- [ ] Person
- [ ] Group
- [ ] GroupMember
- [ ] Account
- [ ] Portfolio
- [ ] Asset
- [ ] Holding
- [ ] Transaction
- [ ] GroupTransaction
- [ ] Allocation
- [ ] LedgerEntry
- [ ] Valuation
- [ ] Fee

## Phase 3 — Financial Engine
- [ ] Deposit
- [ ] Withdrawal
- [ ] Buy
- [ ] Sell
- [ ] Transfer
- [ ] Reinvestment
- [ ] Fee
- [ ] Adjustment
- [ ] Reversal
- [ ] Idempotency
- [ ] Atomic posting

## Phase 4 — Group Transactions
- [ ] Group target
- [ ] Specific-person target
- [ ] Equal allocation
- [ ] Percentage allocation
- [ ] Fixed allocation
- [ ] Cash effect
- [ ] Reinvestment effect
- [ ] Allocation reconciliation

## Phase 5 — Valuation
- [ ] Asset prices
- [ ] Holdings valuation
- [ ] Cash
- [ ] Liabilities
- [ ] NAV
- [ ] NAV per unit
- [ ] Daily snapshots
- [ ] Historical valuation
- [ ] Profit/Loss

## Phase 6 — Fees
- [ ] Fee rules
- [ ] Rate versioning
- [ ] Calculation
- [ ] Caps
- [ ] Settlement
- [ ] Reports

## Phase 7 — Security
- [ ] Authentication
- [ ] RBAC
- [ ] Permissions
- [ ] Audit log
- [ ] Separation of duties
- [ ] Backup
- [ ] Restore

## Phase 8 — Reports
- [ ] Fund
- [ ] Person
- [ ] Group
- [ ] Transactions
- [ ] Holdings
- [ ] P/L
- [ ] Valuation
- [ ] Fees
- [ ] Audit
- [ ] Excel export
- [ ] PDF export

## Phase 9 — Migration
- [ ] Excel parser
- [ ] Mapping
- [ ] Validation
- [ ] Preview
- [ ] Import batch
- [ ] Reconciliation
- [ ] Rollback

## Phase 10 — Quality
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Regression suite
- [ ] CI
- [ ] Lint
- [ ] Type checks
- [ ] Migration tests

## Phase 11 — UI
- [ ] Dashboard
- [ ] People
- [ ] Groups
- [ ] Accounts
- [ ] Portfolios
- [ ] Assets
- [ ] Transactions
- [ ] Group transactions
- [ ] Valuation
- [ ] Fees
- [ ] Reports
- [ ] Settings

## Definition of Done
هر قابلیت مالی باید Domain rule، validation، test، ledger effect، audit در صورت نیاز و report قابل مشاهده داشته باشد.
