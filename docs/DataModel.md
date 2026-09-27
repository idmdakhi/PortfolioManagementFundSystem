# Logical Data Model (Current Implementation)

## جداول پیاده‌سازی‌شده (Actual Tables)

### groups
| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| name | varchar(100) | NOT NULL, UNIQUE |
| is_active | boolean | NOT NULL, DEFAULT true |
| notes | text | NULLABLE |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

### people
| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| name | varchar(120) | NOT NULL, UNIQUE |
| group_id | integer | FK → groups(id), ON DELETE SET NULL |
| account_type | enum | NOT NULL ('fund_and_personal' \| 'personal_only') |
| is_active | boolean | NOT NULL, DEFAULT true |
| excess_fee_rate | decimal(8,4) | NOT NULL, DEFAULT 0.2 |
| fee_cap | bigint | NOT NULL, DEFAULT 1_000_000_000 |
| notes | text | NULLABLE |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

### fund_transactions
| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| tx_date | varchar(20) | NOT NULL (YYYY/MM/DD or ISO) |
| person_id | integer | FK → people(id), ON DELETE SET NULL, NULLABLE |
| type | enum | NOT NULL ('buy_units', 'sell_units', 'mark_to_market', 'adjustment') |
| amount | bigint | NOT NULL (ریال) |
| units | decimal(18,4) | NULLABLE |
| description | text | NULLABLE |
| created_at | timestamp | NOT NULL |

**Indexes**: (person_id, type), (tx_date)

### personal_transactions
| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| tx_date | varchar(20) | NOT NULL |
| person_id | integer | FK → people(id), ON DELETE CASCADE, NOT NULL |
| type | enum | NOT NULL ('deposit', 'withdraw', 'mark_to_market', 'adjustment') |
| amount | bigint | NOT NULL (ریال) |
| asset_type | varchar(50) | NULLABLE (سکه، دلار، سهام، ملک، سپرده، سایر) |
| description | text | NULLABLE |
| created_at | timestamp | NOT NULL |

**Indexes**: (person_id, type), (tx_date)

### group_transactions
| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| tx_date | varchar(20) | NOT NULL |
| type | enum | NOT NULL ('income', 'expense', 'deposit', 'withdraw', 'adjustment') |
| total_amount | bigint | NOT NULL (ریال) |
| target_type | enum | NOT NULL ('group' \| 'specific_people') |
| group_id | integer | FK → groups(id), ON DELETE SET NULL, NULLABLE |
| specific_shares | text | NOT NULL, DEFAULT '[]' (JSON: `{personId, value}[]`) |
| allocation_method | enum | NOT NULL ('equal', 'percent', 'fixed_amount') |
| description | text | NULLABLE |
| created_at | timestamp | NOT NULL |

**Indexes**: (tx_date), (group_id)

### annual_snapshots
| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| year | integer | NOT NULL |
| person_id | integer | FK → people(id), ON DELETE CASCADE, NOT NULL |
| fund_value | bigint | NOT NULL, DEFAULT 0 |
| personal_value | bigint | NOT NULL, DEFAULT 0 |
| total_aum | bigint | NOT NULL, DEFAULT 0 |
| fee_charged | bigint | NOT NULL, DEFAULT 0 |
| notes | text | NULLABLE |
| created_at | timestamp | NOT NULL |

**Constraints**: UNIQUE(year, person_id)
**Indexes**: (year)

### users (AdonisJS Auth)
| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| full_name | varchar(255) | NULLABLE |
| email | varchar(255) | NOT NULL, UNIQUE |
| password | varchar(255) | NOT NULL |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

### access_tokens (AdonisJS Auth)
| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| token | varchar(255) | NOT NULL, UNIQUE |
| name | varchar(255) | NULLABLE |
| type | varchar(255) | NOT NULL |
| token_hash | varchar(255) | NOT NULL |
| abilities | text | NULLABLE |
| expires_at | timestamp | NULLABLE |
| last_used_at | timestamp | NULLABLE |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

---

## جداول **نپیاده‌سازی‌شده** (Planned - Target DataModel.md)

> این جداول در معماری هدف (Architecture.md) تعریف شده‌اند اما در مایگریشن‌های فعلی وجود ندارند.

### assets
- id, code, name, type (Cash, Stock, FundUnit, Gold, Other), currency, precision, is_active, created_at, updated_at

### asset_prices
- id, asset_id (FK), price, currency, effective_date, source, precision, created_at
- INDEX: (asset_id, effective_date)

### portfolios
- id, owner_type (Person/Group/Fund), owner_id, name, is_active, created_at, updated_at

### holdings
- id, portfolio_id (FK), asset_id (FK), quantity (decimal), cost_basis (decimal), updated_at
- UNIQUE: (portfolio_id, asset_id)

### ledger_entries (Append-only, immutable)
- id, transaction_id, transaction_type (fund/personal/group), account_id, portfolio_id, asset_id, direction (debit/credit), amount (decimal), quantity (decimal), effective_date, posted_at, reference, metadata (JSON)
- INDEX: (account_id, effective_date), (transaction_id), (portfolio_id)

### valuations (Daily snapshots)
- id, valuation_date, portfolio_id (nullable for fund-level), total_assets, total_liabilities, net_asset_value, nav_per_unit (nullable), price_snapshot (JSON), holdings_snapshot (JSON), created_at

### fees
- id, fee_rule_id (FK), person_id (FK), calculation_date, cost_basis, current_value, gross_profit, client_fixed_profit, excess_profit, fixed_fee, excess_share, fee_before_cap, final_fee, status (calculated/settled/reversed), settled_at, created_at

### fee_rules
- id, name, type (management/performance), rate, base (cost_basis/nav), period (daily/monthly/quarterly/annual), min_amount, max_amount, conditions (JSON), effective_from, effective_to, version, created_at, updated_at

### audit_logs
- id, actor_id (FK users), actor_type, action, entity, entity_id, before (JSON), after (JSON), timestamp, correlation_id, reason

### roles / permissions / user_roles (RBAC)
- roles: id, name, description
- permissions: id, resource, action, description
- user_roles: user_id, role_id

---

## روابط (Relationships)

```
Group 1 ─── N Person
Person 1 ─── N FundTransaction (person_id nullable for mark_to_market)
Person 1 ─── N PersonalTransaction
GroupTransaction N ─── 1 Group (nullable for specific_people)
GroupTransaction ─── SpecificShares (JSON) → Person[]
AnnualSnapshot N ─── 1 Person
```

## Constraints و نکات مهم

1. **Foreign Keys**: تمام روابط مالکیتی با FK و Cascade/Set Null مناسب
2. **Unique Constraints**: business keyهای یکتا (group name, person name, user email, annual_snapshot year+person)
3. **Indexes**: روی effectiveDate (tx_date)، accountId (person_id)، groupId، transactionId
4. **Precision**: مبالغ به صورت `bigint` (ریال) ذخیره می‌شوند — **خطر خطای اعشاری وجود دارد** (باید decimal/bignumber استفاده شود)
5. **Immutability**: posted financial entry حذف یا update نشود (فعلاً در کد اعمال نشده — نیاز به soft delete یا status field)
6. **History**: FeeRule و membership و داده‌های اثرگذار روی گذشته باید version/history داشته باشند (فعلاً ندارد)

## مهاجرتی مورد نیاز (Migration Gap)

| Target Table | Current Status | Priority |
|--------------|----------------|----------|
| ledger_entries | ❌ Missing | Critical |
| assets / asset_prices | ❌ Missing | High |
| portfolios / holdings | ❌ Missing | High |
| valuations | ❌ Missing | High |
| fees / fee_rules | ❌ Missing (FeeEngine only in-memory) | High |
| audit_logs | ❌ Missing | Medium |
| roles / permissions | ❌ Missing (basic auth only) | Medium |